/**
 * Admin·gamification·management.
 *
 * GET .../api/admin/gamification ...→stats·overview
 * POST .../api/admin/gamification/grant-xp ...→adjust·a·user's·XP
 * GET .../api/admin/gamification/achievements ...→list·achievements
 * POST .../api/admin/gamification/achievements ...→upsert·achievement
 * DELETE /api/admin/gamification/achievements/id ...→deactivate
 * GET .../api/admin/gamification/challenges ...→list·challenges
 * POST .../api/admin/gamification/challenges ...→upsert·challenge
 *
 * Vercel·rewrites·in·vercel.json·funnel·all·of·those·into·this·single·handler
 * so we can keep one auth·boundary and one shared validation surface.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {awardXp} from "../../src/gamification.js";
import {seedAchievementsCatalog} from "../../src/achievements.js";
import {logActivity} from "../../src/activityLog.js";
import type {
  AdminAchievementUpsertPayload,
  AdminGrantXpPayload,
  AdminWeeklyChallengeUpsertPayload,
} from "@upcat/shared";
import {ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_RARITIES, } from "@upcat/shared";

function badRequest(res: VercelResponse, msg: string) {
  return res.status(400).json({success: false, error: msg});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const db = await getDb();

  // The `resource` query param is injected by the `vercel.json` rewrites so
  // we can run every admin gamification route through one handler with one
  // auth boundary. Falls back to URL-path sniffing when called directly.
  const resourceParam = String(req.query.resource || "").toLowerCase();
  const url = req.url || "";
  const path = url.split("?")[0];
  const resource: "overview" | "grant-xp" | "achievements" | "challenges" =
    resourceParam === "grant-xp"
    ? "grant-xp"
    : resourceParam === "achievements"
    ? "achievements"
    : resourceParam === "challenges"
    ? "challenges"
    : path.endsWith("/grant-xp")
    ? "grant-xp"
    : path.includes("/achievements")
    ? "achievements"
    : path.includes("/challenges")
    ? "challenges"
    : "overview";

  // --- Stats overview --------------------------------------------------------
  if (req.method === "GET" && resource === "overview") {
    const [usersCount, activeUsers, achievementsCount, challengesCount, txCount, totalXpAgg] = await Promise.all([
      db.collection("users").countDocuments({}),
      db.collection("users").countDocuments({"gamification.xp": {$gt: 0}}),
      db.collection("achievements_catalog").countDocuments({}),
      db.collection("weekly_challenges_catalog").countDocuments({}),
      db.collection("xp_transactions").countDocuments({}),
      db
      .collection("xp_transactions")
      .aggregate([{$group: {_id: null, total: {$sum: "$amount"}}}])
      .toArray(),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        usersCount,
        activeUsers,
        achievementsCount,
        challengesCount,
        xpTransactions: txCount,
        totalXpAwarded: totalXpAgg[0]?.total ?? 0,
      },
    });
  }

  // --- Grant XP --------------------------------------------------------
  if (req.method === "POST" && resource === "grant-xp") {
    const body = (req.body || {}).asAdminGrantXpPayload;
    if (!body.userId || !ObjectId.isValid(body.userId)) return badRequest(res, "userId is required");
    if (typeof body.amount !== "number" || !Number.isFinite(body.amount)) return badRequest(res, "amount must be a number");
    if (!body.reason || typeof body.reason !== "string") return badRequest(res, "reason is required");
    const targetId = new ObjectId(body.userId);
    const target = await db.collection("users").findOne({_id: targetId});
    if (!target) return res.status(404).json({success: false, error: "User not found"});
    const result = await awardXp(db, targetId, {
      reason: "admin_grant",
      baseAmount: body.amount,
      description: body.reason,
      skipMultiplier: true,
      metadata: {adminId: admin._id.toHexString()},
    });
    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: "admin_gamification.grant_xp",
// ---- Achievements catalog ----------------------------------------
if (resource === "achievements") {
    if (req.method === "GET") {
        const items = await db.collection("achievements_catalog")
        .find({})
        .sort({category: 1, rarity: 1, title: 1})
        .toArray();
        return res.status(200).json({success: true, data: items});
    }
    if (req.method === "POST") {
        const seed = String(req.query.seed || "");
        if (seed === "true") {
            const out = await seedAchievementsCatalog(db);
            await logActivity(db, {
                actorId: admin._id,
                actorRole: "admin",
                action: "admin.gamification.seed_achievements",
                targetType: "achievement_catalog",
                metadata: out,
            });
            return res.status(200).json({success: true, data: out});
        }
        const body = (req.body || {}).asAdminAchievementUpsertPayload;
        if (!body.id) return badRequest(res, "id is required");
        if (!ACHIEVEMENT_CATEGORIES.includes(body.category)) return badRequest(res, "invalid category");
        if (!ACHIEVEMENT_RARITIES.includes(body.rarity)) return badRequest(res, "invalid rarity");
        if (!body.condition || typeof body.condition.kind !== "string") return badRequest(res, "invalid condition");
        const now = new Date();
        const update = await db.collection("achievements_catalog").updateOne(
            {id: body.id},
            {
                $set: {
                    id: body.id,
                    category: body.category,
                    rarity: body.rarity,
                    title: body.title,
                    description: body.description,
                    icon: body.icon,
                    xpReward: body.xpReward,
                    points: body.points,
                    condition: body.condition,
                    hidden: !!body.hidden,
                    isActive: body.isActive !== false,
                    updatedAt: now,
                },
                $setOnInsert: {createdAt: now},
            },
            {upsert: true},
        );
        await logActivity(db, {
            actorId: admin._id,
            actorRole: "admin",
            action: "admin.gamification.upsert_achievement",
            targetType: "achievement",
            metadata: {id: body.id, upserted: !!update.upsertedId},
        });
        return res.status(200).json({success: true});
    }
    if (req.method === "DELETE") {
        const id = String(req.query.id || path.split("/achievements/")[1].split("/")[0] || "");
        if (!id) return badRequest(res, "id required in path");
        await db.collection("achievements_catalog")
            .updateOne({id}, {$set: {isActive: false, updatedAt: new Date()}});
        await logActivity(db, {
            actorId: admin._id,
            actorRole: "admin",
            action: "admin.gamification.deactivate_achievement",
            targetType: "achievement",
            metadata: {id},
        });
        return res.status(200).json({success: true});
    }
}

// ---- Weekly challenges catalog ----------------------------------------
if (resource === "challenges") {
    if (req.method === "GET") {
        const items = await db.collection("weekly_challenges_catalog")
            .find({})
            .sort({title: 1})
            .toArray();
        return res.status(200).json({success: true, data: items});
    }
    if (req.method === "POST") {
        const body = (req.body || {}).asAdminWeeklyChallengeUpsertPayload;
        if (!body.id) return badRequest(res, "id is required");
        if (!body.metric) return badRequest(res, "metric is required");
        if (typeof body.target !== "number") || body.target <= 0) return badRequest(res, "target must be > 0");
        const now = new Date();
        await db.collection("weekly_challenges_catalog").updateOne(
            {id: body.id},
            {
                $set: {
                    id: body.id,
{
  title: "body.title",
  description: "body.description",
  metric: "body.metric",
  target: "body.target",
  threshold: "body.threshold??null",
  xpReward: "body.xpReward",
  weight: "body.weight??1",
  isActive: "body.isActive!==false",
  updatedAt: "now",
},
$setOnInsert: {createdAt: now},
{
  upsert: true},
);
await logActivity(db, {
  actorId: admin._id,
  actorRole: "admin",
  action: "admin.gamification.upsert_challenge",
  targetType: "weekly_challenge",
  metadata: {id: body.id},
});
return res.status(200).json({success: true});
}
```

res.setHeader("Allow", "GET, POST, DELETE");
return res.status(405).json({success: false, error: "Method not allowed"});