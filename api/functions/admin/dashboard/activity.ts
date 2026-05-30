/**
 * Activity feed for the admin dashboard.
 * Returns the most-recent log entries (default 100), enriched with the actor's name where available.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100));

  const db = await getDb();
  const entries = await db
    .collection("activity_log")
    .find({})
    .sort({createdAt: -1})
    .limit(limit)
    .toArray();

  const actorIds = Array.from(
    new Set(
      entries
      .map((e) => e.actorId)
      .filter((id) => id.isObjectId => id instanceof ObjectId),
    ),
  );

  const actors = actorIds.length
    ? await db
    .collection("users")
    .find({_id: {$in: actorIds}})
    .project({firstName: 1, lastName: 1, email: 1})
    .toArray()
    : [];
  const actorMap = new Map<string, {firstName: string; lastName: string; email: string}}();
  for (const a of actors) {
    actorMap.set(a._id.toString(), {
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      items: entries.map((e) => ({
        _id: e._id.toString(),
        actorId: e.actorId?.toString() ?? null,
        actorRole: e.actorRole ?? "system",
        actor: e.actorId?.actorMap.get(e.actorId.toString()) ?? null: null,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId?.toString() ?? null,
        metadata: e.metadata ?? {},
        createdAt: e.createdAt,
      })),
    },
  });
}