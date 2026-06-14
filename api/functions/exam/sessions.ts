import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId, type WithId, type Document } from "mongodb";
import { extractToken } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { getPlatformSettings } from "../../src/platformSettings.js";

type ExamSessionListDoc = WithId<Document> & {
  status?: string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  config?: {
    totalQuestions?: number;
  };
  score?: {
    percentage?: number | null;
  };
};

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

/**
 * GET /api/exam/sessions?limit=5
 * List the current user's recent exam sessions for the dashboard.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  const payload = extractToken(req);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
    return;
  }

  const limit = Math.max(
    1,
    Math.min(50, parseInt((req.query.limit as string) ?? "5", 10) || 5),
  );

  const db = await getDb();
  const platformSettings = await getPlatformSettings(db);
  const userId = new ObjectId(payload.userId);

  const docs = (await db
    .collection("exam_sessions")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .project({
      status: 1,
      startedAt: 1,
      completedAt: 1,
      "score.percentage": 1,
      "config.totalQuestions": 1,
    })
    .toArray()) as ExamSessionListDoc[];

  const sessions = docs.map((d) => ({
    _id: d._id.toString(),
    status: d.status ?? "unknown",
    startedAt: toIso(d.startedAt),
    completedAt: toIso(d.completedAt),
    totalQuestions: Number(d.config?.totalQuestions ?? 0),
    percentage:
      typeof d.score?.percentage === "number" ? d.score.percentage : null,
  }));

  const completed = (await db
    .collection("exam_sessions")
    .find({ userId, status: "completed" })
    .project({ "score.percentage": 1 })
    .toArray()) as ExamSessionListDoc[];

  const scores = completed
    .map((c) => Number(c.score?.percentage ?? 0))
    .filter((n) => Number.isFinite(n));

  const totalExams = completed.length;
  const averageScore =
    totalExams === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / totalExams);
  const bestScore = totalExams === 0 ? 0 : Math.max(...scores);

  res.status(200).json({
    success: true,
    data: {
      sessions,
      stats: { totalExams, averageScore, bestScore },
      examDefaults: platformSettings?.examDefaults ?? null,
    },
  });
}
