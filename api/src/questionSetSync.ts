import { type Db, ObjectId, type Document } from "mongodb";
import { SUBJECT_AREAS } from "@upcat/shared";

const DIFFICULTY_KEYS = ["easy", "medium", "hard", "very_hard"] as const;
type DifficultyKey = (typeof DIFFICULTY_KEYS)[number];

type CountRow = {
  _id: string | null;
  count: number;
};

function isDifficultyKey(value: unknown): value is DifficultyKey {
  return (
    typeof value === "string" &&
    (DIFFICULTY_KEYS as readonly string[]).includes(value)
  );
}

function toDifficultyMixPercentages(
  counts: Record<DifficultyKey, number>
): Record<DifficultyKey, number> {
  const total = DIFFICULTY_KEYS.reduce((sum, key) => sum + counts[key], 0);

  if (total <= 0) {
    return { easy: 0, medium: 0, hard: 0, very_hard: 0 };
  }

  const base = Object.fromEntries(
    DIFFICULTY_KEYS.map((key) => [key, Math.floor((counts[key] / total) * 100)])
  ) as Record<DifficultyKey, number>;

  const used = DIFFICULTY_KEYS.reduce((sum, key) => sum + base[key], 0);
  let remaining = 100 - used;

  if (remaining > 0) {
    const byRemainder = [...DIFFICULTY_KEYS].sort((a, b) => {
      const remainderA = (counts[a] / total) * 100 - base[a];
      const remainderB = (counts[b] / total) * 100 - base[b];
      return remainderB - remainderA;
    });

    for (const key of byRemainder) {
      if (remaining <= 0) break;
      base[key] += 1;
      remaining -= 1;
    }
  }

  return base;
}

export async function syncQuestionSetPublishedCounts(db: Db, setId: string) {
  if (!setId || !ObjectId.isValid(setId)) return;

  const setObjectId = new ObjectId(setId);
  const setDoc = await db.collection("question_sets").findOne({ _id: setObjectId });

  if (!setDoc || !setDoc.distribution || typeof setDoc.distribution !== "object") {
    return;
  }

  const publishedQuestionMatch: Document = {
    isDeleted: { $ne: true },
    $and: [
      { $or: [{ setId }, { setId: setObjectId }] },
      {
        $or: [
          { publicationStatus: "published" },
          { publicationStatus: { $exists: false }, isDraft: false },
          { publicationStatus: null, isDraft: false },
        ],
      },
    ],
  };

  const counts = await db
    .collection("questions")
    .aggregate<CountRow>([
      { $match: publishedQuestionMatch },
      { $group: { _id: "$subjectArea", count: { $sum: 1 } } },
    ])
    .toArray();

  const countsBySubject = new Map<string, number>(
    counts.map((row) => [String(row._id ?? ""), Number(row.count ?? 0)])
  );

  const difficultyCounts = await db
    .collection("questions")
    .aggregate<CountRow>([
      { $match: publishedQuestionMatch },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ])
    .toArray();

  const difficultyTotals: Record<DifficultyKey, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    very_hard: 0,
  };

  for (const row of difficultyCounts) {
    if (isDifficultyKey(row._id)) {
      difficultyTotals[row._id] = Number(row.count ?? 0);
    }
  }

  const difficultyMix = toDifficultyMixPercentages(difficultyTotals);

  const distributionRecord = setDoc.distribution as Record<
    string,
    { timeLimit?: unknown }
  >;

  const nextDistribution = Object.fromEntries(
    SUBJECT_AREAS.map((subject) => {
      const existing = distributionRecord[subject] ?? {};

      return [
        subject,
        {
          questions: countsBySubject.get(subject) ?? 0,
          timeLimit: Math.max(0, Number(existing.timeLimit ?? 0)),
        },
      ];
    })
  );

  const totalQuestions = SUBJECT_AREAS.reduce((sum, subject) => {
    return (
      sum +
      Number(
        (nextDistribution as Record<string, { questions?: unknown }>)[subject]
          ?.questions ?? 0
      )
    );
  }, 0);

  await db.collection("question_sets").updateOne(
    { _id: setObjectId },
    {
      $set: {
        distribution: nextDistribution,
        totalQuestions,
        difficultyMix,
        updatedAt: new Date().toISOString(),
      },
    }
  );
}
