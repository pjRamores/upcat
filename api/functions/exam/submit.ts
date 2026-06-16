import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireSessionAccess} from "../../src/examHelpers.js";
import {type SubjectArea, XP_REWARDS} from "@upcat/shared";
import {scoreSessionEntries, type SessionScoreEntry} from "../../src/examScoring.js";
import {getPlatformSettings} from "../../src/platformSettings.js";
import type {RewardContext} from "../../src/gamification.js";
import {applyRewards, bumpStats, ensureGamification, updateDailyStreak,} from "../../src/gamification.js";
import { bumpScoreThresholdCounters } from "../../src/achievements.js";
import { updateWeeklyChallengeProgress } from "../../src/weeklyChallenge.js";
import { addCardsForQuestions } from "../../src/practice.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const ctx = await requireSessionAccess(req, res);
    if (!ctx) return;
    const { db, sessionId, userId } = ctx;

    const session = await db.collection("exam_sessions").findOne({
        _id: sessionId,
        userId: userId,
    });
    if (!session) {
        return res.status(404).json({ success: false, error: "Session not found" });
    }
    if (session.status === "completed" && session.score) {
        return res.status(200).json({
            success: true,
            data: {
                sessionId: sessionId.toString(),
                score: session.score,
                alreadyScored: true,
            },
        });
    }
    if (session.status === "abandoned") {
        return res.status(400).json({ success: false, error: "Session was abandoned" });
    }

    const entries = (session.questions ?? []).map((e) => ({
        questionId: e.questionId,
        userAnswer: e.userAnswer,
        timeSpent: e.timeSpent,
        flagged: e.flagged ?? false,
        correctAnswer: e.correctAnswer,
    }));

    const flaggedQuestionIds = Array.isArray(req.body?.flaggedQuestionIds)
        ? (req.body.flaggedQuestionIds as unknown[])
            .filter((id): id is string => typeof id === "string" && ObjectId.isValid(id))
        : [];
    const flaggedSet = new Set(flaggedQuestionIds);

    const questionIds = entries.map((e) => e.questionId);
    const questionDocs = await db
        .collection("questions")
        .find({ _id: { $in: questionIds } })
        .project({ correctAnswer: 1, subjectArea: 1 })
        .toArray();

    const byId = new Map(
        questionDocs.map((q) => [
            q._id.toString(),
            {
                correctAnswer: q.correctAnswer as "A" | "B" | "C" | "D",
                subjectArea: q.subjectArea as SubjectArea,
            },
        ]),
    );

    const normalizedEntries: SessionScoreEntry[] = entries.map((entry) => ({
        questionId: entry.questionId.toString(),
        userAnswer: entry.userAnswer,
        timeSpent: entry.timeSpent,
        correctAnswer: entry.correctAnswer,
    }));

  const platformSettings = await getPlatformSettings(db);

  const { updatedEntries: scoredEntries, score } = scoreSessionEntries(
    normalizedEntries,
    byId,
    platformSettings.scoring,
  );

  const scoredByQuestionId = new Map(
    scoredEntries.map((entry) => [entry.questionId, entry]),
  );

  const updatedSessionEntries = entries.map((entry) => {
    const scored = scoredByQuestionId.get(entry.questionId.toString());
    return {
      ...entry,
      isCorrect: scored?.isCorrect ?? false,
      flagged: flaggedSet.has(entry.questionId.toString()),
    };
  });

  const completedAt = new Date();

  await db.collection("exam_sessions").updateOne(
    { _id: sessionId },
    {
      $set: {
        status: "completed",
        completedAt,
        score,
        questions: updatedSessionEntries,
      },
    },
  );

  // --- Gamification: streak + XP + achievements ---
  const userDoc = await db.collection("users").findOne({ _id: userId });
  const canApplyGamification = Boolean(userDoc);
  const wasFirstExam = !userDoc?.gamification?.stats?.examsCompleted;

  if (userDoc) {
    ensureGamification(userDoc);
  }

  let gamification: Awaited<ReturnType<typeof applyRewards>> | null = null;
  let streakInfo: Awaited<ReturnType<typeof updateDailyStreak>>["info"] | null = null;
  let weeklyChallengeProgress: Awaited<ReturnType<typeof updateWeeklyChallengeProgress>> | null =
    null;

  if (canApplyGamification) {
    const streak = await updateDailyStreak(db, userId);
    streakInfo = streak.info;

    await bumpStats(db, userId, {
      examsCompleted: 1,
      perfectScores: score.percentage >= 100 ? 1 : 0,
      questionsAnswered: score.total,
      correctAnswers: score.correct,
    });

    const thresholds: number[] = [];
    if (score.percentage >= 80) thresholds.push(80);
    if (score.percentage >= 90) thresholds.push(90);
    await bumpScoreThresholdCounters(db, userId, thresholds);

    const rewards: RewardContext[] = [
      { reason: "exam_completed", baseAmount: XP_REWARDS.EXAM_COMPLETED },
      {
        reason: "exam_correct_bonus",
        baseAmount: score.correct * XP_REWARDS.PER_CORRECT,
        description: `${score.correct} correct answers`,
      },
    ];

    if (wasFirstExam) {
      rewards.push({
        reason: "first_exam",
        baseAmount: XP_REWARDS.FIRST_EXAM,
        skipMultiplier: true,
      });
    }

    if (score.percentage >= 100) {
      rewards.push({
        reason: "exam_perfect",
        baseAmount: XP_REWARDS.PERFECT_SCORE,
      });
    } else if (score.percentage >= 90) {
      rewards.push({
        reason: "exam_score_90",
        baseAmount: XP_REWARDS.SCORE_ABOVE_90,
      });
    } else if (score.percentage >= 80) {
      rewards.push({
        reason: "exam_score_80",
        baseAmount: XP_REWARDS.SCORE_ABOVE_80,
      });
    }

    for (const [subj, stat] of Object.entries(score.bySubject)) {
      if ((stat.total ?? 0) > 0 && (stat.percentage ?? 0) >= 100) {
        rewards.push({
          reason: "exam_perfect_subject",
          baseAmount: XP_REWARDS.PERFECT_SUBJECT,
          description: `Perfect ${subj}`,
          metadata: { subject: subj },
        });
      }
    }

    gamification = await applyRewards(db, userId, rewards);

    try {
      weeklyChallengeProgress = await updateWeeklyChallengeProgress(db, userId, {
        examsCompleted: 1,
        questionsCorrect: score.correct,
        perfectScores: score.percentage >= 100 ? 1 : 0,
        scoreAchieved: score.percentage,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
        // eslint-disable-next-line no-console
        console.error("[exam/submit] weekly challenge update failed", err);
      }
    }
  }

  // --- Phase 13: auto-enroll flagged + incorrect questions into practice deck ---
  let practiceCardsAdded = 0;

  try {
    const flaggedEntries = updatedSessionEntries
      .filter((entry) => entry.flagged)
      .map((e) => {
        const meta = byId.get(e.questionId.toString());
        return meta
          ? { questionId: e.questionId, subjectArea: meta.subjectArea }
          : null;
      })
      .filter(
        (x): x is { questionId: ObjectId; subjectArea: SubjectArea } => x !== null,
      );

    if (flaggedEntries.length > 0) {
      const created = await addCardsForQuestions(db, userId, flaggedEntries, "manual");
      practiceCardsAdded += created;
    }

    const incorrectEntries = scoredEntries
      .filter((entry) => entry.isCorrect === false && !flaggedSet.has(entry.questionId))
      .map((entry) => {
        const meta = byId.get(entry.questionId);
        return meta
          ? { questionId: new ObjectId(entry.questionId), subjectArea: meta.subjectArea }
          : null;
      })
      .filter(
        (x): x is { questionId: ObjectId; subjectArea: SubjectArea } => x !== null,
      );

    if (incorrectEntries.length > 0) {
      const created = await addCardsForQuestions(
        db,
        userId,
        incorrectEntries,
        "exam_incorrect",
      );
      practiceCardsAdded += created;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
      // eslint-disable-next-line no-console
      console.error("[exam/submit] practice deck enrollment failed", err);
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      sessionId: sessionId.toString(),
      score,
      completedAt: completedAt.toISOString(),
      practiceCardsAdded,
      gamification: {
        ...(gamification ?? {
          xp: { gained: 0, total: 0 },
          level: null,
          multiplier: 1,
          appliedRewards: [],
          skippedRewards: [],
          unlocked: { achievements: [], badges: [] },
        }),
        streakUpdated: streakInfo,
        weeklyChallengeProgress,
      },
    },
  });
}
