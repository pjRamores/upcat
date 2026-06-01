/**
 * Platform-wide analytics for the admin Analytics page.
 *
 * GET /api/admin/analytics?period=week|month|year|all
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

const PERIODS = {
  week: 7,
  month: 30,
  year: 365,
  all: 0,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const periodKey = (String(req.query.period ?? "month") as keyof typeof PERIODS) || "month";
  const days = PERIODS[periodKey] ?? PERIODS.month;
  const since = days === 0 ? new Date(0) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const db = await getDb();
  const users = db.collection("users");
  const sessions = db.collection("exam_sessions");
  const questions = db.collection("questions");
  const flags = db.collection("question_flags");

  const [
    totalUsers,
    verifiedUsers,
    repeatedUsers,
    registrationsByDay,
    completionsByDay,
    statusAgg,
    avgScoreAgg,
    avgDurationAgg,
    scoreHistogram,
    questionStats,
    subjectByDifficulty,
    dauWauMau,
  ] = await Promise.all([
    users.countDocuments({ }),
    users.countDocuments({isVerified: true}),
    sessions,
    aggregate([
      $match: {status: "completed"},
      $group: {_id: "$userId", n: {$sum: 1}}},
      $match: {n: {$gte: 2}}},
      $count: "total",
    ])
    .toArray(),
    users
    .aggregate([
      $match: {createdAt: {$gte: since}}},
      {
        $group: {
          _id: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
          n: {$sum: 1},
        },
      },
      {$sort: {_id: 1}},
    ])
    .toArray(),
    sessions
    .aggregate([
      $match: {status: "completed", completedAt: {$gte: since}}},
      {
        $group: {
          _id: {$dateToString: {format: "%Y-%m-%d", date: "$completedAt"}},
          n: {$sum: 1},
        },
        avgScore: {$avg: "$score.percentage"},
      },
      {
        $sort: {_id: 1}},
    ])
    .toArray(),
    sessions
    .aggregate([
      $match: {status: "completed", completedAt: {$gte: since}}},
      {
        $group: {_id: null, avg: {$avg: "$score.percentage"}}},
      ],
    ],
    {
      $match: {
        status: "completed",
        completedAt: {$gte: since},
        startedAt: {$exists: true},
      },
    },
  ],
}
$project: {
  durationSec: {$divide: [{$subtract: ["$completedAt", "$startedAt"]}], 1000}},
  totalQuestions: "$config.totalQuestions",
},
},
{
  $group: {
    _id: null,
    avgPerQuestion: {
      $avg: {
        $cond: [
          {$gt: ["$totalQuestions", 0]},
          {$divide: ["$durationSec", "$totalQuestions"]},
          null,
        ],
      },
      avgTotal: {$avg: "$durationSec"},
    },
  },
}
.toArray(),
sessions
aggregate([
  {
    $match: {
      status: "completed",
      completedAt: {$gte: since},
      "score.percentage": {$type: "number"},
    },
  },
  {
    $bucket: {
      groupBy: "$score.percentage",
      boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
      default: "other",
      output: {n: {$sum: 1}},
    },
  },
  ]
).toArray(),
questionPerformance(db, since),
questions
aggregate([
  {
    $match: {isDeleted: {$ne: true}}},
  {
    $group: {
      _id: {subject: "$subjectArea", difficulty: "$difficulty"},
      n: {$sum: 1},
    },
  },
  ]
).toArray(),
activeUsers(sessions),
]);

const statusMap = (statusAgg as {_id: string; n: number})[].reduce<Record<string, number>>(
  (acc, r) => ({...acc, [r._id]: r.n}),
);
const startedTotal = (statusMap.completed ?? 0) + (statusMap.in_progress ?? 0) + (statusMap.abandoned ?? 0);
const completionRate = startedTotal > 0 ? (statusMap.completed ?? 0) / startedTotal : 0;
const abandonmentRate = startedTotal > 0 ? (statusMap.abandoned ?? 0) / startedTotal : 0;

const flagCounts = await flags.aggregate([{$group: {_id: "$status", n: {$sum: 1}}}]).toArray();

return res.status(200).json({
  success: true,
  data: {
    period: periodKey,
    userMetrics: {
      totalUsers,
      verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 1000) / 10 : 0,
      retentionRate:
        totalUsers > 0
        ? Math.round(((repeatedUsers[0] as {
          total?: number
        }) | undefined)?.total ?? 0) / totalUsers) * 1000) /
        10
        : 0,
      registrationsByDay: (registrationsByDay as {_id: string; n: number})[].map((r) => ({
        date: r._id,
        count: r.n,
      })),
    },
    examMetrics: {
      completionsByDay: (completionsByDay as {_id: string; n: number; avgScore?: number})[].map((r) => ({
        date: r._id,
        count: r.n,
        averageScore: typeof r.avgScore === "number" ? Math.round(r.avgScore * 10) / 10 : null,
      })),
      averageScore: Math.round(((avgScoreAgg[0] as {avg?: number}) | undefined)?.avg ?? 0) * 10) / 10,
      completionRate: Math.round(completionRate * 1000) / 10,
      abandonmentRate: Math.round(abandonmentRate * 1000) / 10,
      averageTimePerQuestionSec: Math.round(
        ((avgDurationAgg[0] as {avgPerQuestion?: number}) | undefined)?.avgPerQuestion ?? 0) * 10,
      ) / 10,
      averageExamDurationSec: Math.round(
        ((avgDurationAgg[0] as {avgTotal?: number}) | undefined)?.avgTotal ?? 0),
      ),
      scoreDistribution: bucketize(scoreHistogram as {_id: number} | "other"; n: number})[],
    },
    questionMetrics: questionStats,
    subjectMetrics: buildSubjectMatrix(subjectByDifficulty as {
..._id: { subject: string; difficulty: string };
...n: number
...}[]),
...engagementMetrics: dauWauMau,
...flagsByStatus: (flagCounts as { _id: string; n: number })[]).reduce<Record<string, number>>(
...(acc, r) => ({...acc, [r._id]: r.n}),
...{}},
...),
...},
...});
}

async function questionPerformance(db: Awaited<ReturnType<typeof getDb>>, since: Date) {
  // Aggregate per-question stats from session.questions.arrays.
  const stats = await db
  .collection("exam_sessions")
  .aggregate([
    {$match: {status: "completed", completedAt: {$gte: since}}},
    {$unwind: "$questions"},
    {
      $group: {
        _id: "$questions.questionId",
        attempts: {$sum: 1},
        correct: {$sum: {$cond: ["$questions.isCorrect", 1, 0]}}},
      },
    },
    {$match: {attempts: {$gte: 1}}},
    {
      $lookup: {
        from: "questions",
        localField: "_id",
        foreignField: "_id",
        as: "q",
      },
    },
    {$unwind: {path: "$q", preserveNullAndEmptyArrays: true}},
    {
      $project: {
        questionId: "$_id",
        attempts: 1,
        accuracy: {$multiply: [{$divide: ["$correct", "$attempts"]}, 100]},
        subjectArea: "$q.subjectArea",
        difficulty: "$q.difficulty",
        questionText: "$q.questionText",
        flagCount: {$ifNull: ["$q.flagCount", 0]},
        isDeleted: {$ifNull: ["$q.isDeleted", false]},
      },
    },
  ])
  .toArray();

  const filtered = stats.filter((s) => s.questionText && !s.isDeleted);
  const trim = (s: typeof filtered) =>
    s.map((q) => ({
      _id: q.questionId.toString(),
      subjectArea: q.subjectArea,
      difficulty: q.difficulty,
      preview: String(q.questionText ?? "").slice(0, 100),
      attempts: q.attempts,
      accuracy: Math.round(q.accuracy * 10) / 10,
      flagCount: q.flagCount,
    }));

  const all = trim(filtered);
  const hardest = trim(filtered.filter((q) => q.accuracy < 30).sort((a, b) => a.accuracy - b.accuracy)).slice(0, 25);
  const easiest = trim(filtered.filter((q) => q.accuracy > 90).sort((a, b) => b.accuracy - a.accuracy)).slice(0, 25);
  const mostUsed = trim([...filtered].sort((a, b) => b.attempts - a.attempts)).slice(0, 25);
  const mostFlagged = trim([...filtered].sort((a, b) => (b.flagCount as number) - (a.flagCount as number))).slice(0, 25);

  // "Never used" requires checking against the questions collection.
  const usedIds = new Set(filtered.map((s) => s.questionId.toString()));
  const allQs = await db
  .collection("questions")
  .find({isDeleted: {$ne: true}})
  .project({subjectArea: 1, difficulty: 1, questionText: 1, flagCount: 1})
  .limit(2000)
  .toArray();
  const neverUsed = allQs
  .filter((q) => !usedIds.has(q._id.toString()))
  .slice(0, 25)
  .map((q) => ({
    _id: q._id.toString(),
    subjectArea: q.subjectArea,
    difficulty: q.difficulty,
    preview: String(q.questionText ?? "").slice(0, 100),
    attempts: 0,
    accuracy: 0,
    flagCount: q.flagCount ?? 0,
  }));

  return {all: all.slice(0, 100), hardest, easiest, mostUsed, mostFlagged, neverUsed};
}

function bucketize(buckets: {_id: number | "other"; n: number}[]) {
  const labels = ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90-100"];
  const counts = labels.map(() => 0);
  for (const b of buckets) {
    if (typeof b._id === "number") {
      const idx = Math.min(9, Math.floor(b._id / 10));
      counts[idx] += b.n;
    }
  }
  return labels.map((label, i) => ({range: label, count: counts[i]}));
}
function buildSubjectMatrix(rows: {_id: {subject: string; difficulty: string}}; n: number[]) {
  const grid: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    grid[r._id.subject]?.??= {};
    grid[r._id.subject][r._id.difficulty] = r.n;
  }
  return grid;
}

async function activeUsers(sessions: ReturnType<Awaited<ReturnType<typeof getDb>>["collection"]>) {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const distinct = async (since: Date) =>
    await sessions.distinct("userId", {startedAt: {$gte: since}})).length;
  const [dau, wau, mau] = await Promise.all([
    distinct(dayAgo),
    distinct(weekAgo),
    distinct(monthAgo),
  ]);
  return {dau, wau, mau};
}