import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { extractToken } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { getPlatformSettings } from "../../src/platformSettings.js";

/**
 * GET /api/exam/sessions?limit=5
 * List the current user's recent exam sessions for the dashboard.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }
    const payload = extractToken(req);
    if (!payload) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const limit = Math.max(1, Math.min(50, parseInt((req.query.limit as string) ?? "5", 10) || 5));
    const db = await getDb();
    const platformSettings = await getPlatformSettings(db);

    const docs = await db
        .collection("exam_sessions")
        .find({ userId: new ObjectId(payload.userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .project({
            status: 1,
            startedAt: 1,
            completedAt: 1,
            "score.percentage": 1,
            "config.totalQuestions": 1,
        })
        .toArray();

    const sessions = docs.map((d) => ({
        _id: (d._id as ObjectId).toString(),
        status: d.status,
        startedAt: (d.startedAt as Date)?.toISOString() ?? null,
        completedAt: (d.completedAt as Date)?.toISOString() ?? null,
        totalQuestions: d.config?.totalQuestions ?? 0,
        percentage: d.score?.percentage ?? null,
    }));

    // Quick aggregate stats
    const completed = await db
        .collection("exam_sessions")
        .find({ userId: new ObjectId(payload.userId), status: "completed" })
        .project({ "score.percentage": 1 })
        .toArray();

    const scores = completed.map((c) => c.score?.percentage ?? 0);
    const totalExams = completed.length;
    const averageScore = totalExams === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / totalExams);
    const bestScore = totalExams === 0 ? 0 : Math.max(...scores);

    return res.status(200).json({
        success: true,
        data: {
            sessions,
            stats: { totalExams, averageScore, bestScore },
            examDefaults: platformSettings?.examDefaults ?? null,
        },
    });
}