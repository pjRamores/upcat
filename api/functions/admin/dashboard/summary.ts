import { type VercelRequest, type VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../../src/auth.js";
import { getDb } from "../../../src/db.js";

type CountByKey = { _id: string | null; n: number };
type AvgResult = { _id: null; avg: number };
type ActivityLogResult = { createdAt?: Date | string };
type FlagQuestionResult = { _id: string | null };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const db = await getDb();
    const now = Date.now();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const users = db.collection("users");
    const questions = db.collection("questions");
    const sessions = db.collection("exam_sessions");
    const flags = db.collection("question_flags");
    const passages = db.collection("passages");
    const contact = db.collection("contact_messages");
    const activityLog = db.collection("activity_log");

    const [
      userTotal,
      userActive,
      userVerified,
      userUnverified,
      userToday,
      userWeek,
      userMonth,
      questionTotal,
      questionsBySubject,
      questionsByDifficulty,
      flaggedQuestionIds,
      questionsRecent,
      sessionsTotal,
      sessionsToday,
      sessionsWeek,
      avgScoreAgg,
      sessionStatusAgg,
      activeRightNow,
      passagesTotal,
      openContact,
      lastSeed,
    ] = await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ isActive: true }),
      users.countDocuments({ isVerified: true }),
      users.countDocuments({ isVerified: false }),
      users.countDocuments({ createdAt: { $gte: startOfDay } }),
      users.countDocuments({ createdAt: { $gte: startOfWeek } }),
      users.countDocuments({ createdAt: { $gte: startOfMonth } }),

      questions.countDocuments({ isDeleted: { $ne: true } }),

      questions
        .aggregate<CountByKey>([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: "$subjectArea", n: { $sum: 1 } } },
        ])
        .toArray(),

      questions
        .aggregate<CountByKey>([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: "$difficulty", n: { $sum: 1 } } },
        ])
        .toArray(),

      flags
        .aggregate<FlagQuestionResult>([
          { $match: { resolved: { $ne: true } } },
          { $group: { _id: "$questionId" } },
        ])
        .toArray(),

      questions.countDocuments({
        isDeleted: { $ne: true },
        createdAt: { $gte: startOfWeek },
      }),

      sessions.countDocuments({}),

      sessions.countDocuments({
        status: "completed",
        completedAt: { $gte: startOfDay },
      }),

      sessions.countDocuments({
        status: "completed",
        completedAt: { $gte: startOfWeek },
      }),

      sessions
        .aggregate<AvgResult>([
          {
            $match: {
              status: "completed",
              "score.percentage": { $type: "number" },
            },
          },
          { $group: { _id: null, avg: { $avg: "$score.percentage" } } },
        ])
        .toArray(),

      sessions
        .aggregate<CountByKey>([
          { $group: { _id: "$status", n: { $sum: 1 } } },
        ])
        .toArray(),

      sessions.countDocuments({ status: "in_progress" }),

      passages.countDocuments({ isDeleted: { $ne: true } }),

      contact.countDocuments({
        $or: [
          { status: { $exists: false } },
          { status: { $ne: "resolved" } },
        ],
      }),

      activityLog
        .find({ action: "admin.seed_completed" })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray() as Promise<ActivityLogResult[]>,
    ]);

    const toMap = (arr: CountByKey[]) =>
      arr.reduce<Record<string, number>>((acc, r) => {
        acc[String(r._id ?? "unknown")] = r.n;
        return acc;
      }, {});

    const statusMap = toMap(sessionStatusAgg);

    const startedTotal =
      (statusMap.completed ?? 0) +
      (statusMap.in_progress ?? 0) +
      (statusMap.abandoned ?? 0);

    const completionRate =
      startedTotal > 0 ? ((statusMap.completed ?? 0) / startedTotal) * 100 : 0;

    const averageScore = Math.round((avgScoreAgg?.avg ?? 0) * 10) / 10;

    const lastSeedCreatedAt = lastSeed?.createdAt;
    const lastSeedDate =
      lastSeedCreatedAt instanceof Date
        ? lastSeedCreatedAt.toISOString()
        : typeof lastSeedCreatedAt === "string"
          ? new Date(lastSeedCreatedAt).toISOString()
          : null;

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: userTotal,
          active: userActive,
          verified: userVerified,
          unverified: userUnverified,
          newToday: userToday,
          newThisWeek: userWeek,
          newThisMonth: userMonth,
        },
        questions: {
          total: questionTotal,
          bySubject: toMap(questionsBySubject),
          byDifficulty: toMap(questionsByDifficulty),
          flagged: flaggedQuestionIds.length,
          recentlyAdded: questionsRecent,
        },
        exams: {
          totalSessions: sessionsTotal,
          completedToday: sessionsToday,
          completedThisWeek: sessionsWeek,
          averageScore,
          averageCompletionRate: Math.round(completionRate * 10) / 10,
          activeRightNow,
        },
        platform: {
          uptime: "N/A (serverless)",
          lastSeedDate,
          totalPassages: passagesTotal,
          openContactMessages: openContact,
        },
      },
    });
  } catch (error) {
    console.error("admin summary error", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
