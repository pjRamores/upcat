import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {getDb} from "../../src/db.js";
import {extractToken} from "../../src/auth.js";

/**
 * Lightweight summary used by the Dashboard quick-stats card.
 * For the full analytics dashboard, see /api/stats/overview.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const payload = extractToken(req);
  if (!payload) {
    return res.status(401).json({success: false, error: "Unauthorized"});
  }

  const db = await getDb();
  const sessions = await db
    .collection("exam_sessions")
    .find({userId: new ObjectId(payload.userId), status: "completed"})
    .project({"score.percentage": 1})
    .toArray();

  const totalExams = sessions.length;
  const scores = sessions.map((s) => s.score?.percentage ?? 0);
  const averageScore =
    totalExams > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalExams) : 0;
  const bestScore = totalExams > 0 ? Math.max(...scores) : 0;

  return res.status(200).json({
    success: true,
    data: {totalExams, averageScore, bestScore},
  });
}