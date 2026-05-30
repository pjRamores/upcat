/**
 * Admin endpoint: view a user's exam set assignment history
 * GET /api/admin/exams/users/:userId/assignment-history
 *
 * Shows all question sets assigned to a user across all mock exam sessions,
 * in chronological order with session IDs and counts.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {getDb} from "../../src/db.js";
import {requireAdmin} from "../../src/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const {userId} = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({success: false, error: "userId query param is required"});
  }

  let targetUserId: ObjectId;
  try {
    targetUserId = new ObjectId(userId);
  } catch {
    return res.status(400).json({success: false, error: "Invalid userId format"});
  }

  const db = await getDb();

  // Fetch per-user/per-set aggregate counts
  const aggregateAssignments = await db
    .collection("exam_set_assignments")
    .find({userId: targetUserId})
    .sort({updatedAt: -1})
    .toArray();

  // Fetch per-session assignment events
  const assignmentEvents = await db
    .collection("exam_set_assignment_events")
    .find({userId: targetUserId})
    .sort({assignedAt: -1})
    .limit(100)
    .toArray();

  const setCountMap = new Map<string, number>();
  for (const doc of aggregateAssignments) {
    const setId = String(doc.setId ?? "unknown");
    setCountMap.set(setId, Number(doc.assignedCount ?? 0));
  }

  const events = assignmentEvents.map((evt) => ({
    sessionId: evt.sessionId?.toString(),
    setId: String(evt.setId ?? "unknown"),
    assignedAt: evt.assignedAt?.toISOString(),
  }));
  return res.status(200).json({
    success: true,
    data: {
      userId: targetUserId.toString(),
      aggregateCounts: Object.fromEntries(setCountMap),
      recentEvents: events,
    },
  });
}