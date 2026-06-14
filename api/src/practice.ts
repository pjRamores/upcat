/**
 * Phase 13 - Spaced Repetition (SM-2) engine.
 *
 * Implements a slightly relaxed SM-2 with four rating buckets:
 * - again -> quality:0 (lapse: reset to learning, interval=0, ease=0.20)
 * - hard -> quality:3 (ease=-0.15, interval × max(0.5 × ease, 1.2))
 * - good -> quality:4 (standard SM-2)
 * - easy -> quality:5 (ease+0.15, interval × ease × 1.3)
 *
 * State transitions:
 * new → learning on first rating
 * learning → review after first "good" or "easy" (repetitions ≥ 2)
 * any → mastered when intervalDays ≥ 30 AND ease ≥ 2.5
 * review → learning on "again" (lapse)
 */
import { type Db, type Document, ObjectId, type WithId } from "mongodb";
import type {
  PracticeCard,
  PracticeCardStatus,
  PracticeMode,
  PracticeRating,
  PracticeSessionCard,
  SubjectArea,
} from "@upcat/shared";
import {
  PRACTICE_DEFAULTS,
  SRS_DEFAULT_EASE,
  SRS_MASTERY_EASE,
  SRS_MASTERY_INTERVAL_DAYS,
  SRS_MIN_EASE,
} from "@upcat/shared";

// Utilities
function clampEase(ease: number): number {
  return Math.max(SRS_MIN_EASE, Math.min(3.0, Number(ease.toFixed(3))));
}

function statusFor(
  intervalDays: number,
  ease: number,
  repetitions: number,
  status: PracticeCardStatus,
): PracticeCardStatus {
  if (intervalDays >= SRS_MASTERY_INTERVAL_DAYS && ease >= SRS_MASTERY_EASE) {
    return "mastered";
  }
  if (status === "new") return "learning";
  if (status === "learning" && repetitions >= 2) return "review";
  return status;
}

export interface SrsState {
  status: PracticeCardStatus;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: Date;
}

/** Pure SM-2 step; `now` controls next review math (defaults to Date.now). */
export function applySrsRating(
  card: Pick<PracticeCard, "status" | "easeFactor" | "intervalDays" | "repetitions">,
  rating: PracticeRating,
  now: Date = new Date(),
): SrsState {
  let { easeFactor, intervalDays, repetitions } = card;
  let status = card.status;

  if (rating === "again") {
    easeFactor = clampEase(easeFactor - 0.2);
    repetitions = 0;
    intervalDays = 0;
    status = "learning";
  } else {
    if (rating === "hard") {
      easeFactor = clampEase(easeFactor - 0.15);
    } else if (rating === "easy") {
      easeFactor = clampEase(easeFactor + 0.15);
    }
  }

  repetitions += 1;

  if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = rating === "hard" ? 3 : rating === "easy" ? 6 : 4;
  } else {
    const multiplier =
      rating === "hard"
        ? Math.max(easeFactor * 0.5, 1.2)
        : rating === "easy"
          ? easeFactor * 1.3
          : easeFactor;

    intervalDays = Math.max(1, Math.round((intervalDays || 1) * multiplier));
  }

  const nextReviewDate = new Date(now.getTime() + intervalDays * 86_400_000);
  status = statusFor(intervalDays, easeFactor, repetitions, status);

  return { status, easeFactor, intervalDays, repetitions, nextReviewDate };
}

// Card persistence helpers
export function defaultCard(
  userId: ObjectId,
  questionId: ObjectId,
  subjectArea: SubjectArea,
): Omit<PracticeCard, "_id"> {
  const now = new Date();

  return {
    userId,
    questionId,
    subjectArea,
    status: "new",
    easeFactor: SRS_DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    nextReviewDate: now,
    totalReviews: 0,
    correctCount: 0,
    incorrectCount: 0,
    createdAt: now,
    updatedAt: now,
    lastReviewedAt: null,
  };
}

/**
 * Idempotently add a list of question ids to a user's practice deck.
 * Existing cards are left untouched. Returns how many were newly created.
 */
export async function addCardsForQuestions(
  db: Db,
  userId: ObjectId,
  entries: Array<{ questionId: ObjectId; subjectArea: SubjectArea }>,
  reason: PracticeCard["source"] = "exam_incorrect",
): Promise<{ created: number; existing: number }> {
  if (entries.length === 0) return { created: 0, existing: 0 };

  const col = db.collection("practice_cards");
  const ids = entries.map((e) => e.questionId);
  const existing = await col
    .find({ userId, questionId: { $in: ids } })
    .project({ questionId: 1 })
    .toArray();
  const existingIds = new Set(existing.map((e) => e.questionId.toString()));
  const toInsert = entries
    .filter((e) => !existingIds.has(e.questionId.toString()))
    .map((e) => ({ ...e, source: reason }));

  if (toInsert.length === 0) return { created: 0, existing: existingIds.size };

  await col.insertMany(toInsert.map((e) => defaultCard(userId, e.questionId, e.subjectArea)));
  return { created: toInsert.length, existing: existingIds.size };
}


export async function pickPracticeCards(
  db: Db,
  userId: ObjectId,
  opts: {
    mode: PracticeMode;
    maxQuestions: number;
    newCardsLimit: number;
    subjectArea?: SubjectArea;
  },
): Promise<{
  dueCards: WithId<Document>[];
  newCards: WithId<Document>[];
  weakSubjects: string[];
}> {
  const col = db.collection("practice_cards");
  const now = new Date();

  const baseFilter: Record<string, unknown> = { userId };

  if (opts.mode === "subject_focus" && opts.subjectArea) {
    baseFilter.subjectArea = opts.subjectArea;
  }

  let weakSubjects: string[] = [];

  if (opts.mode === "weak_areas") {
    const accuracy = await col
      .aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$subjectArea",
            correct: { $sum: "$correctCount" },
            incorrect: { $sum: "$incorrectCount" },
            cards: { $sum: 1 },
          },
        },
        {
          $addFields: {
            accuracy: {
              $cond: [
                { $gt: [{ $add: ["$correct", "$incorrect"] }, 0] },
                {
                  $divide: ["$correct", { $add: ["$correct", "$incorrect"] }],
                },
                0,
              ],
            },
          },
        },
        { $sort: { accuracy: 1, cards: -1 } },
        { $limit: 2 },
      ])
      .toArray();

    weakSubjects = accuracy.map((r) => String(r._id));
    if (weakSubjects.length > 0) {
      baseFilter.subjectArea = { $in: weakSubjects };
    }
  }

  const dueCards = await col
    .find({
      ...baseFilter,
      status: { $in: ["learning", "review"] },
      nextReviewDate: { $lte: now },
    })
    .sort({ nextReviewDate: 1, _id: 1 })
    .limit(opts.maxQuestions)
    .toArray();

  const wantNew =
    opts.mode === "mixed" ||
    opts.mode === "weak_areas" ||
    opts.mode === "subject_focus";

  const newCards: WithId<Document>[] = [];

  if (wantNew && dueCards.length < opts.maxQuestions) {
    const remaining = opts.maxQuestions - dueCards.length;
    const limit = Math.min(opts.newCardsLimit, remaining);

    if (limit > 0) {
      const fetched = await col
        .find({ ...baseFilter, status: "new" })
        .sort({ createdAt: 1, _id: 1 })
        .limit(limit)
        .toArray();

      newCards.push(...fetched);
    }
  }

  return { dueCards, newCards, weakSubjects };
}

// Stats helpers
export async function computePracticeStats(
  db: Db,
  userId: ObjectId,
): Promise<{
  totals: {
    cards: number;
    new: number;
    learning: number;
    review: number;
    mastered: number;
  };
  dueToday: number;
  dueThisWeek: number;
  retentionPct: number;
  totalReviews: number;
  bySubject: Array<{
    subjectArea: string;
    cards: number;
    mastered: number;
    accuracyPct: number;
    dueToday: number;
  }>;
  upcoming: Array<{ date: string; count: number }>;
}> {
  const col = db.collection("practice_cards");
  const sessions = db.collection("practice_sessions");

  const now = new Date();
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setUTCHours(24, 0, 0, 0);
  const inSevenDays = new Date(now.getTime() + 7 * 86_400_000);

  const [
    statusAgg,
    dueTodayCount,
    dueWeekCount,
    subjectAgg,
    upcomingAgg,
    retentionAgg,
    totalReviewsAgg,
  ] = await Promise.all([
    col
      .aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),

    col.countDocuments({
      userId,
      status: { $in: ["learning", "review"] },
      nextReviewDate: { $lte: startOfTomorrow },
    }),

    col.countDocuments({
      userId,
      status: { $in: ["learning", "review"] },
      nextReviewDate: { $lte: inSevenDays },
    }),

    col
      .aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$subjectArea",
            cards: { $sum: 1 },
            mastered: {
              $sum: { $cond: [{ $eq: ["$status", "mastered"] }, 1, 0] },
            },
            correct: { $sum: "$correctCount" },
            incorrect: { $sum: "$incorrectCount" },
            dueToday: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$status", ["learning", "review"]] },
                      { $lte: ["$nextReviewDate", startOfTomorrow] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { cards: -1 } },
      ])
      .toArray(),

    col
      .aggregate([
        {
          $match: {
            userId,
            status: { $in: ["learning", "review"] },
            nextReviewDate: { $lte: inSevenDays },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$nextReviewDate" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),

    col
      .aggregate([
        { $match: { userId, totalReviews: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            correct: { $sum: "$correctCount" },
            total: { $sum: { $add: ["$correctCount", "$incorrectCount"] } },
          },
        },
      ])
      .toArray(),

    sessions
      .aggregate([
        { $match: { userId, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$totalAnswered" } } },
      ])
      .toArray(),
  ]);

  const totals = {
    cards: 0,
    new: 0,
    learning: 0,
    review: 0,
    mastered: 0,
  };

  for (const row of statusAgg) {
    const key = String(row._id) as PracticeCardStatus;
    if (key in totals) {
      totals[key] += Number(row.count);
      totals.cards += Number(row.count);
    }
  }

  const retention =
    retentionAgg.length > 0 && Number(retentionAgg?.total ?? 0) > 0
      ? (Number(retentionAgg.correct) / Number(retentionAgg.total)) * 100
      : 0;

  return {
    totals,
    dueToday: dueTodayCount,
    dueThisWeek: dueWeekCount,
    retentionPct: Number(retention.toFixed(1)),
    totalReviews: Number(totalReviewsAgg?.total ?? 0),
    bySubject: subjectAgg.map((r) => {
      const total = Number(r.correct) + Number(r.incorrect);
      return {
        subjectArea: String(r._id),
        cards: Number(r.cards),
        mastered: Number(r.mastered),
        accuracyPct:
          total > 0 ? Number(((Number(r.correct) / total) * 100).toFixed(1)) : 0,
        dueToday: Number(r.dueToday),
      };
    }),
    upcoming: upcomingAgg.map((r) => ({
      date: String(r._id),
      count: Number(r.count),
    })),
  };
}

export const PRACTICE_LIMITS = {
  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 50,
  MIN_NEW_CARDS: 0,
  MAX_NEW_CARDS: 20,
  DEFAULT_MAX_QUESTIONS: PRACTICE_DEFAULTS.maxQuestions,
  DEFAULT_NEW_CARDS_LIMIT: PRACTICE_DEFAULTS.newCardsLimit,
} as const;

export function defaultPracticeSessionCard(
  card: WithId<Document>,
  order: number,
  isNewIntroduction: boolean,
): Omit<PracticeSessionCard, "cardId" | "questionId"> & {
  cardId: ObjectId;
  questionId: ObjectId;
} {
  return {
    cardId: card._id as ObjectId,
    questionId: card.questionId as ObjectId,
    status: card.status as PracticeCardStatus,
    isNewIntroduction,
    order,
    userAnswer: null,
    isCorrect: null,
    rating: null,
    timeSpent: null,
    preEaseFactor: Number(card.easeFactor),
    preIntervalDays: Number(card.intervalDays),
    preRepetitions: Number(card.repetitions),
    postEaseFactor: null,
    postIntervalDays: null,
    postRepetitions: null,
    postStatus: null,
    postNextReviewDate: null,
  };
}
