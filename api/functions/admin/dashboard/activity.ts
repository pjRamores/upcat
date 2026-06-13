/**
 * Activity feed for the admin dashboard.
 * Returns the most recent log entries (default 100), enriched with the actor's name where available.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../../src/auth.js";
import { getDb } from "../../../src/db.js";

type Actor = {
  _id: ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type ActivityEntry = {
  _id: ObjectId;
  actorId?: ObjectId | null;
  actorRole?: string;
  action?: string;
  targetType?: string;
  targetId?: ObjectId | string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date | string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100));

  const db = await getDb();

  const entries = (await db
    .collection("activity_log")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()) as ActivityEntry[];

  const actorIds = Array.from(
    new Set(
      entries
        .map((e) => e.actorId)
        .filter((id): id is ObjectId => id instanceof ObjectId)
    )
  );

  const actors = actorIds.length
    ? ((await db
        .collection("users")
        .find({ _id: { $in: actorIds } })
        .project({ firstName: 1, lastName: 1, email: 1 })
        .toArray()) as Actor[])
    : [];

  const actorMap = new Map<
    string,
    { firstName: string | null; lastName: string | null; email: string | null }
  >();

  for (const a of actors) {
    actorMap.set(a._id.toString(), {
      firstName: a.firstName ?? null,
      lastName: a.lastName ?? null,
      email: a.email ?? null,
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      items: entries.map((e) => ({
        _id: e._id.toString(),
        actorId: e.actorId?.toString() ?? null,
        actorRole: e.actorRole ?? "system",
        actor: e.actorId instanceof ObjectId
          ? actorMap.get(e.actorId.toString()) ?? null
          : null,
        action: e.action ?? null,
        targetType: e.targetType ?? null,
        targetId: e.targetId?.toString() ?? null,
        metadata: e.metadata ?? {},
        createdAt: e.createdAt ?? null,
      })),
    },
  });
}
