/**
 * POST/api/practice/[sessionId]/complete
 *
 * Finalizes an in-progress practice session: computes totals, marks status
 * completed`, bumps gamification stats, awards XP, updates weekly-challenge
 * progress, and evaluates achievements. Idempotent -- completing an already
 * completed session returns its stored aggregates with no further XP.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {applyRewards, bumpStats, type RewardContext,} from "../../src/gamification.js";
import {updateWeeklyChallengeProgress} from "../../src/weeklyChallenge.js";
import type {PracticeCompleteResponse, PracticeRating,} from "@upcat/shared";
import {XP_REWARDS} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const sessionIdRaw = (req.query.sessionId ?? req.query.id) as string | undefined;
  if (!sessionIdRaw || !ObjectId.isValid(sessionIdRaw)) {
    return res.status(400).json({success: false, error: "Invalid sessionId"});
  }
  const sessionOid = new ObjectId(sessionIdRaw);

  const db = await getDb();

  const session = await db
    .collection("practice_sessions")
    .findOne({_id: sessionOid, userId: user._id});
  if (!session) {
    return res.status(404).json({success: false, error: "Session not found"});
  }
  if (session.status === "completed") {
    return res.status(200).json({
      success: true,
      data: {
        sessionId: sessionOid.toString(),
        totalAnswered: session.totalAnswered ?? 0,
        totalCorrect: session.totalCorrect ?? 0,
        accuracyPct: session.accuracyPct ?? 0,
        durationMs: session.durationMs ?? 0,
        alreadyCompleted: true,
      },
    });
  }
  if (session.status === "abandoned") {
    return res.status(400).json({success: false, error: "Session was abandoned"});
  }

  const cards = (session.cards ?? []) as Array<
    isCorrect: boolean | null;
    rating: PracticeRating | null;
  >;
  const answered = cards.filter((c) => c.isCorrect !== null && c.rating !== null);
  const totalAnswered = answered.length;
  const totalCorrect = answered.filter((c) => c.isCorrect === true).length;
  const accuracyPct =
    totalAnswered > 0 ? Number(((totalCorrect / totalAnswered) * 100).toFixed(1)) : 0;

  if (totalAnswered === 0) {
    // Empty session -- mark abandoned so it doesn't clutter stats.
    await db.collection("practice_sessions").updateOne(
      {_id: sessionOid},
      {$set: {status: "abandoned", completedAt: new Date()}},
    );
    return res.status(400).json({
      success: false,
      error: "Cannot complete a session with zero answered cards",
    });
  }

  const completedAt = new Date();
  const startedAt = session.startedAt instanceof Date ? session.startedAt : new Date(session.startedAt);
  const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());

  await db.collection("practice_sessions").updateOne(
    {_id: sessionOid},
    {
      $set: {
        status: "completed",
        completedAt,
        durationMs,
        totalAnswered,
        totalCorrect,
        accuracyPct,
      },
    },
  );

  // Gamification: stats + XP + weekly challenge + achievements
  await bumpStats(db, user._id, {
    practiceSessions: 1,
    questionsAnswered: totalAnswered,
    correctAnswers: totalCorrect,
  });
}

const rewards: RewardContext[] = [
{reason: "practice_completed", baseAmount: XP_REWARDS.PRACTICE_COMPLETED},
];
if (totalCorrect > 0) {
  rewards.push({
    reason: "practice_correct",
    baseAmount: totalCorrect * XP_REWARDS.PRACTICE_PER_CORRECT,
    description: `${totalCorrect} correct in practice`,
  });
}
const gamification = await applyRewards(db, user._id, rewards);

try {
  const weekly = await updateWeeklyChallengeProgress(db, user._id, {
    practiceSessions: 1,
    questionsCorrect: totalCorrect,
  });
  if (weekly) {
    (gamification as PracticeCompleteResponse["gamification"]) && {
      weeklyChallengeProgress?: unknown;
    }).weeklyChallengeProgress = weekly;
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[practice/complete] weekly challenge update failed", err);
}

const data: PracticeCompleteResponse = {
  sessionId: sessionOid.toString(),
  totalAnswered,
  totalCorrect,
  accuracyPct,
  durationMs,
  gamification,
};
return res.status(200).json({success: true, data});
}