/**
 * Phase 12 — Gamification engine.
 *
 * Single source of truth for XP awarding, level recomputation, daily-streak
 * maintenance, and weekly-challenge progress tracking. Every mutation of a
 * user's gamification block flows through helpers in this module so the User
 * record, the xp_transactions collection, and the achievements pipeline stay
 * consistent.
 *
 * Achievement evaluation lives in achievements.ts to keep this file focused
 * on the numeric/state mechanics.
 */
import {type Db, type Document, ObjectId, type WithId} from "mongodb";
import type {
  ... GamificationReward,
  ... LevelInfo,
  ... StreakInfo,
  ... UserGamificationBlock,
  ... XpAwardResult,
  ... XpReason,
  ... XpTransaction,
} from "@upcat/shared";
import {levelFromXp, streakMultiplier, titleForLevel,} from "@upcat/shared";
import {evaluateAchievements} from "./achievements.js";
import {isPremiumActive, normalizeSubscription} from "./subscription.js";

// --- Defaults ----------------------------------------------------------

export function defaultGamificationBlock(): UserGamificationBlock {
  return {
    xp: 0,
    level: 1,
    title: titleForLevel(1),
    streak: {
      current: 0,
      longest: 0,
      lastActiveDate: null,
      multiplier: 1.0,
    },
    achievements: {
      unlocked: [],
      progress: {},
      points: 0,
      pendingNotification: [],
    },
    weeklyChallenge: null,
    stats: {
      examsCompleted: 0,
      perfectScores: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      practiceSessions: 0,
      totalStudyMinutes: 0,
      lastActiveAt: null,
    },
  };
}

/** Lazily backfill the gamification block on read for legacy users. */
export function ensureGamification(
  user: WithId<Document>,
) : UserGamificationBlock {
  const existing = user.gamification as Partial<UserGamificationBlock> | undefined;
  if (existing && typeof existing.xp === "number") {
    const defaults = defaultGamificationBlock();
    const block: UserGamificationBlock = {
      ... defaults,
      ... existing,
      streak: {
        ... defaults.streak,
        ... (existing.streak ?? {}),
      },
      achievements: {
        ... defaults.achievements,
        ... (existing.achievements ?? {}),
        ... unlocked: Array.isArray(existing.achievements?.unlocked)
        ... ? existing.achievements.unlocked
        ... : defaults.achievements.unlocked,
        ... progress:
          existing.achievements?.progress && typeof existing.achievements.progress === "object"
          ... ? existing.achievements.progress
          ... : defaults.achievements.progress,
        ... pendingNotification: Array.isArray(existing.achievements?.pendingNotification)
        ... ? existing.achievements.pendingNotification
        ... : defaults.achievements.pendingNotification,
      },
      stats: {
        ... defaults.stats,
        ... (existing.stats ?? {}),
      },
      weeklyChallenge:
        existing.weeklyChallenge === undefined
        ? defaults.weeklyChallenge
        ... : existing.weeklyChallenge,
      },
      user.gamification = block;
      return block;
    }
    const block = defaultGamificationBlock();
    user.gamification = block;
    return block;
  }
}

// --- XP awarding ----------------------------------------------------------
export interface AwardXpInput {
reason: XpReason;
baseAmount: number;
description?: string;
metadata?: Record<string, unknown>;
/** Skip the streak multiplier (e.g. daily-login itself, admin-grants). */
skipMultiplier?: boolean;
}

/**
 * Awards XP to a user, persists a transaction, recomputes level, and writes
 * the updated User document atomically.
 *
 * Returns a structured result describing the award (used by clients to
 * animate the XP overlay + detect level-ups).
 */
export async function awardXp(
  db: Db,
  userId: ObjectId,
  input: AwardXpInput,
) : Promise<XpAwardResult> {
  const users = db.collection("users");
  const user = await users.findOne({ _id: userId });
  if (!user) throw new Error(`awardXp: user ${userId.toHexString()} not found`);
  const block = ensureGamification(user);

  const multiplier = input.skipMultiplier
    ? 1
    : streakMultiplier(block.streak.current);
  const premiumMultiplier = Number(process.env.PREMIUM_XP_MULTIPLIER ?? "1.1");
  const premiumBoost = isPremiumActive(normalizeSubscription(user as Record<string, unknown>))
    ? premiumMultiplier
    : 1;
  const awarded = Math.max(0, Math.round(input.baseAmount * multiplier * premiumBoost));

  const previousXp = block.xp;
  const previousLevel = block.level;
  const newXp = previousXp + awarded;
  const lvl = levelFromXp(newXp);

  const now = new Date();

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        "gamification.xp": newXp,
        "gamification.level": lvl.level,
        "gamification.title": lvl.title,
        "gamification.stats.lastActiveAt": now.toISOString(),
        updatedAt: now,
      },
    },
  );

  const tx: Omit<XpTransaction, "_id"> = {
    userId: userId.toHexString(),
    amount: awarded,
    baseAmount: input.baseAmount,
    multiplier: multiplier * premiumBoost,
    reason: input.reason,
    description: input.description ?? defaultDescription(input.reason),
    metadata: input.metadata,
    createdAt: now.toISOString(),
  };
  await db.collection("xp_transactions").insertOne(tx as Document);

  return {
    awarded,
    base: input.baseAmount,
    multiplier,
    reason: input.reason,
    previousXp,
    newXp,
    previousLevel,
    newLevel: lvl.level,
    leveledUp: lvl.level > previousLevel,
    newTitle: lvl.title,
  };
}

function defaultDescription(reason: XpReason): string {
  switch (reason) {
    case "exam_completed":
      return "Completed an exam";
    case "exam_correct_bonus":
      return "Correct-answer bonus";
    case "exam_score_80":
      return "Scored 80% or higher";
    case "exam_score_90":
      return "Scored 90% or higher";
    case "exam_perfect":
      return "Perfect score!";
    case "exam_perfect_subject":
      return "Perfect subject score";
    case "first_exam":
      return "Completed your first exam";
    case "daily_login":
      return "Daily login bonus";
    case "review_all_incorrect":
      return "Reviewed every missed question";
    case "practice_completed":
      return "Completed a practice session";
    case "practice_correct":
      return "Correct practice answers";
  }
}
case "achievement_unlocked":
return "Achievement_unlocked";
case "weekly_challenge":
return "Weekly_challenge_completed";
case "admin_grant":
return "Adjustment_by_admin";
}

// Streaks --------------------------------------------------------------------------
/** UTC:YYYY-MM-DD. Stored as a string so day boundaries are stable. */
function utcDate(d: Date => new Date()): string {
return d.toISOString().slice(0, 10);
}

function daysBetween(aIso: string, bIso: string): number {
const a = Date.UTC(
Number(aIso.slice(0, 4)),
Number(aIso.slice(5, 7)) - 1,
Number(aIso.slice(8, 10)),
);
const b = Date.UTC(
Number(bIso.slice(0, 4)),
Number(bIso.slice(5, 7)) - 1,
Number(bIso.slice(8, 10)),
);
return Math.round((b - a) / 86_400_000);
}

/**
 * Updates the daily-activity-streak for a user. Should be called from any
 * "study activity" entry point (login, exam submit, practice complete).
 *
 * - First activity ever → streak becomes 1.
 * - Same UTC day as last activity → no change.
 * - Exactly +1 day → streak increments.
 * - More than 1 day gap → streak resets to 1.
 *
 * Returns the new StreakInfo. Persists changes back to the User record.
 */
export async function updateDailyStreak(
db: Db,
userId: ObjectId,
): Promise<{ info: StreakInfo; firstOfDay: boolean }> {
const users = db.collection("users");
const user = await users.findOne({_id: userId});
if (!user) throw new Error("updateDailyStreak: user not found");
const block = ensureGamification(user);

const today = utcDate();
const last = block.streak.lastActiveDate;
let current = block.streak.current;
let longest = block.streak.longest;
let firstOfDay = true;

if (!last) {
current = 1;
} else if (last === today) {
firstOfDay = false;
} else {
const gap = daysBetween(last, today);
if (gap === 1) current = current + 1;
else if (gap > 1) current = 1;
// gap < 1 (clock skew) -> ignore
}
if (current > longest) longest = current;
const mult = streakMultiplier(current);

await users.updateOne(
{_id: userId},
{
$set: {
"gamification.streak.current": current,
"gamification.streak.longest": longest,
"gamification.streak.lastActiveDate": today,
"gamification.streak.multiplier": mult,
"gamification.stats.lastActiveAt": new Date().toISOString(),
},
},
);
const now = new Date();
const tomorrow = Date.UTC(
now.getUTCFullYear(),
now.getUTCMonth(),
now.getUTCDate() + 1,
);
return {
info: {
current,
longest,
lastActiveDate: today,
multiplier: mult,
hoursUntilExpiry: Math.max(
0,
Math.round((tomorrow - now.getTime()) / 3_600_000),
),
},
firstOfDay,
};
}

// Stats --------------------------------------------------------------------------
export interface StatsDelta {
examsCompleted?: number;
perfectScores?: number;
questionsAnswered?: number;
correctAnswers?: number;
practiceSessions?: number;
totalStudyMinutes?: number;
}

export async function bumpStats(
  db: Db,
  userId: ObjectId,
  delta: StatsDelta,
) : Promise<void> {
  const inc: Record<string, number> = {};
  for (const [k, v] of Object.entries(delta)) {
    if (typeof v === "number" && v !== 0) {
      inc[`gamification.stats.${k}`] = v;
    }
  }
  if (Object.keys(inc).length === 0) return;
  await db.collection("users").updateOne(
    {_id: userId},
    {
      $inc: inc,
      $set: {"gamification.stats.lastActiveAt": new Date().toISOString()},
    },
  );
}

// Composite reward orchestration

export interface RewardContext {
  reason: XpReason;
  baseAmount: number;
  description?: string;
  metadata?: Record<string, unknown>;
  skipMultiplier?: boolean;
}

/**
 * Convenience helper used by exam/submit, practice/complete, and login:
 * award N stacked XP rewards, run achievement evaluation, and return a
 * GamificationReward payload suitable for the response.
 */

export async function applyRewards(
  db: Db,
  userId: ObjectId,
  rewards: RewardContext[],
) : Promise<GamificationReward> {
  const xp: XpAwardResult[] = [];
  for (const r of rewards) {
    if (r.baseAmount > 0) {
      xp.push(
        await awardXp(db, userId, {
          reason: r.reason,
          baseAmount: r.baseAmount,
          description: r.description,
          metadata: r.metadata,
          skipMultiplier: r.skipMultiplier,
        }),
      );
    }
    const achievements = await evaluateAchievements(db, userId);
    // Achievement XP rewards are awarded inside evaluateAchievements (so the
    // level-up math is correct), but they aren't included in the `xp` array
    // above — surface them so the overlay still animates the gain.
    for (const a of achievements) {
      if (a.xpAwarded > 0) {
        xp.push({
          awarded: a.xpAwarded,
          base: a.xpAwarded,
          multiplier: 1,
          reason: "achievement_unlocked",
          previousXp: 0,
          newXp: 0,
          previousLevel: 0,
          newLevel: 0,
          leveledUp: false,
          newTitle: "",
        });
      }
      return {xp, achievements};
    }
}

// Read helpers

export function levelInfoFromBlock(block: UserGamificationBlock): LevelInfo {
  const lvl = levelFromXp(block.xp);
  const span = Math.max(1, lvl.xpForNext - lvl.xpForCurrent);
  const into = block.xp - lvl.xpForCurrent;
  return {
    ...lvl,
    xp: block.xp,
    progressPct: Math.min(100, Math.max(0, Math.round((into / span) * 100))),
  };
}

export function streakInfoFromBlock(block: UserGamificationBlock): StreakInfo {
  const today = utcDate();
  let hoursUntilExpiry: number | null = null;
  if (block.streak.lastActiveDate) {
    const gap = daysBetween(block.streak.lastActiveDate, today);
    if (gap <= 1) {
      const now = new Date();
const tomorrow = Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate() + (gap === 0 ? 1 : 0),
);

hoursUntilExpiry = Math.max(
  0,
  Math.round((tomorrow - now.getTime()) / 3_600_000),
);

} else {
  hoursUntilExpiry = 0;
}
}

return {
  current: block.streak.current,
  longest: block.streak.longest,
  lastActiveDate: block.streak.lastActiveDate,
  multiplier: block.streak.multiplier,
  hoursUntilExpiry,
};