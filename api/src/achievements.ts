/**
 * Phase 12 — Achievement evaluation engine.
 *
 * Loads active achievement definitions from `achievements_catalog`,
 * evaluates each one against a user's current gamification stats, and
 * unlocks any that newly qualify. Newly unlocked achievements:
 * - award their xpReward + points (xp awarded inline, no streak multiplier)
 * - mark the user as having an unacknowledged notification
 * - return a structured event the API can ship to the client.
 *
 * Achievement *progress* (for counters where target > 1) is recomputed on
 * every evaluation so partial progress always reflects the latest stats.
 */
import {type Db, type Document, ObjectId, type WithId,} from "mongodb";
import type {
  AchievementCondition,
  AchievementDef,
  AchievementUnlockEvent,
  UserAchievement,
  UserGamificationBlock,
} from "@upcat/shared";
import {ACHIEVEMENT_CATALOG_SEED, levelFromXp,} from "@upcat/shared";
import {ensureGamification} from "./gamification.js";

export interface CatalogDoc extends Omit<AchievementDef, "_id" | "createdAt" | "updatedAt"> {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

async function loadCatalog(db: Db): Promise<CatalogDoc[]> {
  return db
  .collection<CatalogDoc>("achievements_catalog")
  .find({isActive: true})
  .toArray();
}

/** Returns [current, target] for a condition based on the user's stats. */
function evaluateCondition(
  cond: AchievementCondition,
  block: UserGamificationBlock,
  perSubjectPerfect: Record<string, number>,
) : { current: number; target: number; unlocked: boolean } {
  switch (cond.kind) {
    case "examCount":
      return wrap(block.stats.examsCompleted, cond.gte);
    case "perfectScores":
      return wrap(block.stats.perfectScores, cond.gte);
    case "scoreThreshold":
      // Count tracked via achievement.progress.map.keyed by `score_ge<gte>`.
      const key = `score_ge_${cond.gte}`;
      const current = block.achievements.progress[key] ?? 0;
      return wrap(current, cond.count);
    }
    case "streakDays":
      return wrap(block.streak.longest, cond.gte);
    case "totalXp":
      return wrap(block.xp, cond.gte);
    case "levelReached":
      const lvl = levelFromXp(block.xp).level;
      return wrap(lvl, cond.gte);
    }
    case "questionsAnswered":
      return wrap(block.stats.questionsAnswered, cond.gte);
    case "correctAnswers":
      return wrap(block.stats.correctAnswers, cond.gte);
    case "practiceSessions":
      return wrap(block.stats.practiceSessions, cond.gte);
    case "perfectSubject":
      return wrap(perSubjectPerfect[cond.subject] ?? 0, cond.gte);
    case "studyMinutes":
      return wrap(block.stats.totalStudyMinutes, cond.gte);
    case "consecutiveDailyLogins":
      return wrap(block.streak.current, cond.gte);
  }
}

function wrap(current: number, target: number) {
  return {current, target, unlocked: current >= target};
}

/**
 * Pre-aggregates per-subject perfect-score counts (for perfectSubject rules).
 * Hits the `exams` collection but bounded by userId so this is cheap.
 */
async function perSubjectPerfectCounts(
  db: Db,
  userId: ObjectId,
) : Promise<Record<string, number>> {
  // exam_sessions stores score.bySubject as an object map:
  // {Mathematics: {correct, total, percentage},...}
  // Aggregate per-subject perfect counts by iterating the keys.
  const sessions = await db
  .collection("exam_sessions")
  .find(
    {userId, status: "completed"},
    {projection: {"score.bySubject": 1}},
  )
  .toArray();
  const out: Record<string, number> = {};
  for (const s of sessions) {
    const by = (s.score?.bySubject ?? {}) as Record<
      string,
      {percentage?: number; total?: number}
    );
  }
}
>;
for (const [subj, stat] of Object.entries(by)) {
if ((stat.total ?? 0) > 0 && (stat.percentage ?? 0) >= 100) {
out[subj] = (out[subj] ?? 0) + 1;
}
}
return out;
}

/**
 * Evaluate all active achievements for a user, unlocking any new ones.
 * Returns the list of newly unlocked achievement events (used by the client
 * to play celebration UI). Idempotent: re-running is a no-op once a user
 * has unlocked an achievement.
 */
export async function evaluateAchievements(
db: Db,
userId: ObjectId,
): Promise<AchievementUnlockEvent[]> {
const catalog = await loadCatalog(db);
if (catalog.length === 0) return [];

const users = db.collection("users");
const user = await users.findOne({_id: userId});
if (!user) return [];
const block = ensureGamification(user);

const perSubject = await perSubjectPerfectCounts(db, userId);
const unlockedSet = new Set(block.achievements.unlocked);
const newEvents: AchievementUnlockEvent[] = [];
const progressPatch: Record<string, number> = {};
let xpToAdd = 0;
let pointsToAdd = 0;

for (const def of catalog) {
const {current, target, unlocked} = evaluateCondition(
def.condition,
block,
perSubject,
);
progressPatch(`gamification.achievements.progress.${def.id}`) = current;

if (unlocked && !unlockedSet.has(def.id)) {
unlockedSet.add(def.id);
xpToAdd += def.xpReward;
pointsToAdd += def.points;
newEvents.push({
achievementId: def.id,
title: def.title,
description: def.description,
rarity: def.rarity,
icon: def.icon,
xpAwarded: def.xpReward,
points: def.points,
unlockedAt: new.Date().toISOString(),
});
}
}

if (newEvents.length === 0) {
// Only persist progress updates.
await users.updateOne({_id: userId}, {$set: progressPatch});
return [];
}

const newXp = block.xp + xpToAdd;
const lvl = levelFromXp(newXp);
const now = new Date();
await users.updateOne(
{_id: userId},
{
$set: {
progressPatch,
"gamification.achievements.unlocked": Array.from(unlockedSet),
"gamification.achievements.points": block.achievements.points + pointsToAdd,
"gamification.xp": newXp,
"gamification.level": lvl.level,
"gamification.title": lvl.title,
updatedAt: now,
},
$push: {
"gamification.achievements.pendingNotification": {
$each: newEvents.map((e) => e.achievementId),
},
} as Document,
},
);
}

// Record xp_transactions for the achievement awards.
await db.collection("xp_transactions").insertMany(
newEvents.map((e) => ({
userId: userId.toHexString(),
amount: e.xpAwarded,
baseAmount: e.xpAwarded,
multiplier: 1,
reason: "achievement_unlocked" as const,
description: `Achievement: ${e.title}`,
metadata: {achievementId: e.achievementId, rarity: e.rarity},
createdAt: now.toISOString(),
})),
);
return newEvents;
/**
 * Public listing for the user's achievements page. Hidden achievements that
 * haven't been unlocked yet are returned with their description blanked out.
 */
export async function listUserAchievements(
  db: Db,
  user: WithId<Document>,
) : Promise<UserAchievement[]> {
  const block = ensureGamification(user);
  const catalog = await loadCatalog(db);
  const perSubject = await perSubjectPerfectCounts(db, user._id);
  const unlockedSet = new Set(block.achievements.unlocked);
  const unlockedAtMap = (block.achievements.as { unlockedAt?: Record<string, string> }).unlockedAt ?? {};

  return catalog
  .map<UserAchievement>((def) => {
    const isUnlocked = unlockedSet.has(def.id);
    const {current, target} = evaluateCondition(def.condition, block, perSubject);
    const visible = isUnlocked || !def.hidden;
    return {
      _id: def._id.toHexString(),
      id: def.id,
      category: def.category,
      rarity: def.rarity,
      title: visible ? def.title : "???",
      description: visible ? def.description : "Hidden — keep practicing to discover this achievement.",
      icon: visible ? def.icon : "lock",
      xpReward: def.xpReward,
      points: def.points,
      condition: def.condition,
      hidden: def.hidden,
      isActive: def.isActive,
      createdAt: def.createdAt.toISOString(),
      updatedAt: def.updatedAt.toISOString(),
      unlocked: isUnlocked,
      unlockedAt: unlockedAtMap[def.id] ?? null,
      progress: Math.min(current, target),
      target,
      progressPct: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    };
  })
  .sort((a, b) => {
    // Unlocked first (newest first), then by rarity weight desc, then title.
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    const rarityWeight = {common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5} as const;
    const ra = rarityWeight[a.rarity];
    const rb = rarityWeight[b.rarity];
    if (ra !== rb) return rb - ra;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Increment a per-threshold counter (used by exam/submit before evaluating
 * scoreThreshold conditions). Pass thresholds the score qualifies for, e.g.
 * a 92 -> bumps both `score_ge_80` and `score_ge_90`.
 */
export async function bumpScoreThresholdCounters(
  db: Db,
  userId: ObjectId,
  thresholds: number[],
) : Promise<void> {
  if (thresholds.length === 0) return;
  const inc: Record<string, number> = {};
  for (const t of thresholds) {
    inc[`gamification.achievements.progress.score_ge_${t}`] = 1;
  }
  await db.collection("users").updateOne({_id: userId}, {$inc: inc});
}

/** Seed (or update) the achievements_catalog with the shared default set. */
export async function seedAchievementsCatalog(db: Db): Promise<
  upserted: number;
  total: number;
} > {
  const col = db.collection("achievements_catalog");
  const now = new Date();
  let upserted = 0;
  for (const seed of ACHIEVEMENT_CATALOG_SEED) {
    const res = await col.updateOne(
      {id: seed.id},
      {
        $set: {
          ...seed,
          hidden: seed.hidden ?? false,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {createdAt: now},
      },
      {upsert: true},
    );
    if (res.upsertedCount > 0) upserted += 1;
  }
  const total = await col.countDocuments();
  return {upserted, total};
}