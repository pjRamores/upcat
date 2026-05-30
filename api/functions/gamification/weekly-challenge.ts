/**
 * GET /api/gamification/weekly-challenge -- current challenge + progress.
 * POST /api/gamification/weekly-challenge -- claim reward when completed.
 *
 * Assignment of weekly challenges happens via the assign-weekly-challenges
 * cron (Mondays 04:00 UTC) or lazily on first GET if a user has none.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {type Db, ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {awardXp, ensureGamification,} from "../../src/gamification.js";
import {evaluateAchievements} from "../../src/achievements.js";
import type {WeeklyChallengeDef} from "@upcat/shared";

/** Pick a random active challenge weighted by `weight` (default 1). */
async function pickChallenge(db: Db): Promise<WeeklyChallengeDef> | null> {
  const all = (await db
    .collection("weekly_challenges_catalog")
    .find({isActive: true})
    .toArray()).as<unknown> as WeeklyChallengeDef[];
  if (all.length === 0) return null;
  const total = all.reduce((s, c) => s + (c.weight || 1), 0);
  let pick = Math.random() * total;
  for (const c of all) {
    pick -= c.weight || 1;
    if (pick <= 0) return c;
  }
  return all[all.length - 1];
}

/** Assigns a fresh challenge to a user, expiring 7 days from now. */
async function assignChallengeToUser(
  db: Db,
  userId: ObjectId,
) : Promise<{challenge: WeeklyChallengeDef; assignedAt: string; expiresAt: string} | null> {
  const chal = await pickChallenge(db);
  if (!chal) return null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 3_600_000);
  await db.collection("users").updateOne(
    {_id: userId},
    {
      $set: {
        "gamification.weeklyChallenge": {
          challengeId: chal.id,
          assignedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          progress: 0,
          target: chal.target,
          completed: false,
          completedAt: null,
          rewardClaimed: false,
        },
      },
    },
  );
  return {
    challenge: chal,
    assignedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();
  const block = ensureGamification(user);

  // Lazy-assign if missing or expired.
  const existing = block.weeklyChallenge;
  const expired = existing && new Date(existing.expiresAt).getTime() < Date.now();
  if (!existing || expired) {
    const fresh = await assignChallengeToUser(db, user._id);
    if (!fresh) {
      return res.status(200).json({success: true, data: null});
    }
    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        data: {
          challenge: fresh.challenge,
          assignedAt: fresh.assignAt,
          expiresAt: fresh.expiresAt,
          progress: 0,
          target: fresh.challenge.target,
          progressPct: 0,
          completed: false,
          completedAt: null,
          rewardClaimed: false,
          msUntilExpiry: 7 * 24 * 3_600_000,
        },
      });
    }
    return res
  }
  return res.status(400)
}
if (req.method === "POST") {
  if (!existing.completed) {
    return res
    .status(400)
    .json({success: false, error: "Challenge not yet completed."});
  }
  if (existing.rewardClaimed) {
    return res
    .status(400)
    .json({success: false, error: "Reward already claimed."});
  }
  const def = (await db
    .collection("weekly_challenges_catalog")
    .findOne({id: existing.challengeId})) as unknown as WeeklyChallengeDef | null;
  if (!def) {
    return res.status(404).json({success: false, error: "Challenge not found."});
  }
  const award = await awardXp(db, user._id, {
    reason: "weekly_challenge",
    baseAmount: def.xpReward,
    description: "Weekly challenge: ${def.title}",
    skipMultiplier: true,
  });
  await db.collection("users").updateOne(
    {_id: user._id},
    {$set: {"gamification.weeklyChallenge.rewardClaimed": true}},
  );
  const achievements = await evaluateAchievements(db, user._id);
  return res.status(200).json({
    success: true,
    data: {reward: award, achievements},
  });
}

// GET with existing active challenge
const def = (await db
    .collection("weekly_challenges_catalog")
    .findOne({id: existing.challengeId})) as unknown as WeeklyChallengeDef | null;
if (!def) {
  return res.status(200).json({success: true, data: null});
}
return res.status(200).json({
  success: true,
  data: {
    challenge: def,
    assignedAt: existing.assignedAt,
    expiresAt: existing.expiresAt,
    progress: existing.progress,
    target: existing.target,
    progressPct: existing.target > 0
    ? Math.min(100, Math.round((existing.progress / existing.target) * 100))
    : 0,
    completed: existing.completed,
    completedAt: existing.completedAt,
    rewardClaimed: existing.rewardClaimed,
    msUntilExpiry: Math.max(0, new Date(existing.expiresAt).getTime() - Date.now()),
  },
});