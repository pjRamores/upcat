/**
 * GET/api/gamification/leaderboard?scope=weekly|monthly|all_time
 *
 * Returns ranked users by XP (all_time) or by XP earned within the rolling
 * window (weekly/monthly) — the window variant aggregates xp_transactions.
 * Always returns up to LEADERBOARD_PAGE_SIZE entries plus the current user's
 * row (rank may be outside the top page).
 *
 * Respects the platform-settings leaderboard.isEnabled flag.
 */

import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import type {LeaderboardEntry, LeaderboardResponse, LeaderboardScope} from "@upcat/shared";
import {LEADERBOARD_PAGE_SIZE, levelFromXp, titleForLevel} from "@upcat/shared";
import {getPlatformSettings} from "../../src/platformSettings.js";

function initials(first: string, last: string): string {
  return `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}` || "?";
}

function displayName(
  first: string,
  last: string,
  showFullName: boolean,
) : string {
  if (showFullName) return `${first}${last}`.trim() || "Anonymous";
  return `${first}${last.charAt(0) ? last.charAt(0) + "." : ""}`.trim() || "Anonymous";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = (
    typeof req.query.scope === "string" ? req.query.scope : "all_time"
    ) as LeaderboardScope;
  if (!["weekly", "monthly", "all_time"].includes(scope)) {
    return res.status(400).json({success: false, error: "Invalid scope"});
  }

  const db = await getDb();
  const settings = await getPlatformSettings(db);
  if (settings.leaderboard?.isEnabled === false) {
    return res.status(403).json({success: false, error: "Leaderboard is disabled."});
  }
  const showFullName = settings.leaderboard?.showFullName !== false;

  let entries: LeaderboardEntry[] = [];
  let currentUserEntry: LeaderboardEntry | null = null;

  if (scope === "all_time") {
    const cursor = db
      .collection("users")
      .find(
        {isActive: true, "gamification.xp": {$gt: 0}},
        {
          projection: {
            firstName: 1,
            lastName: 1,
            "gamification.xp": 1,
            "gamification.level": 1,
            "gamification.title": 1,
            "gamification.streak.current": 1,
            "gamification.achievements.unlocked": 1,
          },
        },
      ),
      sort({"gamification.xp": -1, lastName: 1, firstName: 1})
      .limit(LEADERBOARD_PAGE_SIZE);
    const rows = await cursor.toArray();
    entries = rows.map((u, i) => ({
      rank: i + 1,
      userId: u._id.toString(),
      displayName: displayName(u.firstName ?? ""), u.lastName ?? ""), showFullName,
      avatarInitials: initials(u.firstName ?? ""), u.lastName ?? ""),
      level: u.gamification?.level ?? 1,
      title: u.gamification?.title ?? titleForLevel(1),
      xp: u.gamification?.xp ?? 0,
      streak: u.gamification?.streak?.current ?? 0,
      achievements: u.gamification?.achievements?.unlocked?.length ?? 0,
      isCurrentUser: u._id.toString() === user._id.toString(),
    }));
  // If current user isn't in the top page, fetch their rank.
  if (!entries.some((e) => e.isCurrentUser)) {
    const myXp = user.gamification?.xp ?? 0;
    if (myXp > 0) {
      const above = await db.collection("users").countDocuments({
        isActive: true,
        "gamification.xp": {$gt: myXp},
      });
      currentUserEntry = {
        rank: above + 1,
        userId: user._id.toString(),
        displayName: displayName(user.firstName ?? ""), user.lastName ?? ""), true,
        avatarInitials: initials(user.firstName ?? ""), user.lastName ?? ""),
        level: user.gamification?.level ?? 1,
        title: user.gamification?.title ?? titleForLevel(1),
xp: myXp,
streak: user.gamification?.streak?.current??0,
achievements: user.gamification?.achievements?.unlocked?.length??0,
isCurrentUser: true,
};
}
} else {
currentUserEntry = entries.find((e) => e.isCurrentUser)??null;
}
} else {
// Rolling window via xp_transactions aggregation.
const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - (scope === "weekly" ? 7 : 30));
const cutoffIso = cutoff.toISOString();

const rows = await db
.collection("xp_transactions")
.aggregate([
  {$match: {createdAt: {$gte: cutoffIso}}},
  {$group: {_id: "$userId", xp: {$sum: "$amount"}}},
  {$sort: {xp: -1}},
  {$limit: LEADERBOARD_PAGE_SIZE},
])
.toArray();

if (rows.length > 0) {
const userOids = rows.map((r) => new ObjectId(String(r._id)));
const users = await db
.collection("users")
.find({_id: {$in: userOids}, isActive: true})
.project([
  firstName: 1,
  lastName: 1,
  "gamification.level": 1,
  "gamification.title": 1,
  "gamification.streak.current": 1,
  "gamification.achievements.unlocked": 1,
])
.toArray();
const byId = new Map(users.map((u) => [u._id.toString(), u]));
entries = rows
.map((r, i) => {
  const u = byId.get(String(r._id));
  if (!u) return null;
  return {
    rank: i + 1,
    userId: String(r._id),
    displayName: displayName(u.firstName?? "", u.lastName?? "", showFullName),
    avatarInitials: initials(u.firstName?? "", u.lastName?? ""),
    level: u.gamification?.level?? levelFromXp(0).level,
    title: u.gamification?.title?? titleForLevel(1),
    xp: Number(r.xp) || 0,
    streak: u.gamification?.streak?.current?? 0,
    achievements: u.gamification?.achievements?.unlocked?.length?? 0,
    isCurrentUser: String(r._id) === user._id.toString(),
  };
})
.filter((e) => e.isLeaderboardEntry => e !== null);
}

if (!entries.some((e) => e.isCurrentUser)) {
const myAgg = await db
.collection("xp_transactions")
.aggregate([
  {$match: {userId: user._id.toHexString(), createdAt: {$gte: cutoffIso}}},
  {$group: {_id: null, xp: {$sum: "$amount"}}},
])
.toArray();
const myXp = myAgg[0]?.Number(myAgg[0].xp) || 0::0;
if (myXp > 0) {
const aboveAgg = await db
.collection("xp_transactions")
.aggregate([
  {$match: {createdAt: {$gte: cutoffIso}}},
  {$group: {_id: "$userId", xp: {$sum: "$amount"}}},
  {$match: {xp: {$gt: myXp}}},
  {$count: "n"},
])
.toArray();
const above = aboveAgg[0]?.n??0;
currentUserEntry = {
  rank: above + 1,
  userId: user._id.toString(),
  displayName: displayName(user.firstName?? "", user.lastName?? "", true),
  avatarInitials: initials(user.firstName?? "", user.lastName?? ""),
  level: user.gamification?.level?? 1,
  title: user.gamification?.title?? titleForLevel(1),
  xp: myXp,
  streak: user.gamification?.streak?.current?? 0,
  achievements: user.gamification?.achievements?.unlocked?.length?? 0,
  isCurrentUser: true,
};
}
} else {
currentUserEntry = entries.find((e) => e.isCurrentUser)??null;
}
}

const payload: LeaderboardResponse = {
  scope,
  entries,
  currentUser: currentUserEntry,
  generatedAt: new Date().toISOString(),
};
return res.status(200).json({success: true, data: payload});
}