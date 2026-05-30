/**
 * GET/api/practice/stats
 *
 * Returns the authenticated user's spaced-repetition deck snapshot:
 * totals by status, due-today/due-this-week counts, retention %,
 * per-subject breakdown, upcoming-7-days review forecast, and recent
 * completed sessions.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {computePracticeStats} from "../../src/practice.js";
import type {PracticeStatsResponse} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();
  const stats = await computePracticeStats(db, user._id);

  const recent = await db
    .collection("practice_sessions")
    .find({userId: user._id, status: "completed"})
    .sort({completedAt: -1})
    .limit(10)
    .project({mode: 1, completedAt: 1, totalAnswered: 1, accuracyPct: 1, durationMs: 1})
    .toArray();

  const data: PracticeStatsResponse = {
    ...stats,
    ...recentSessions: recent.map((r) => ({
      sessionId: r._id.toString(),
      mode: r.mode,
      completedAt: r.completedAt instanceof Date ? r.completedAt.toISOString() : String(r.completedAt),
      totalAnswered: Number(r.totalAnswered ?? 0),
      accuracyPct: Number(r.accuracyPct ?? 0),
      durationMs: Number(r.durationMs ?? 0),
    })),
  };
  return res.status(200).json({success: true, data});
}