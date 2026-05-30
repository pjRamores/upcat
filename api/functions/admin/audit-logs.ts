/**
 * Admin·audit·log — paginated, filterable.
 * GET /api/admin/audit-log?actorId=&targetType=&from=&to=
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

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  const actorId = req.query.actorId as string | undefined;
  const targetType = req.query.targetType as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const action = req.query.action as string | undefined;

  const filter: Record<string, unknown> = {};
  if (actorId && ObjectId.isValid(actorId)) filter.actorId = new ObjectId(actorId);
  if (targetType) filter.targetType = targetType;
  if (action) filter.action = {$regex: "^${action.replace(/[.*+?^${()}|[\]\\]/g, "\\$&")}$};
  const range: Record<string, Date> = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) range.$lte = d;
  }
  if (Object.keys(range).length > 0) filter.createdAt = range;

  const db = await getDb();
  const [items, total] = await Promise.all([
    db
      .collection("activity_log")
      .find(filter)
      .sort({createdAt: -1})
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
      db.collection("activity_log").countDocuments(filter),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        items: items.map((e) => ({
          _id: e._id.toString(),
          actorId: e.actorId?.toString() ?? null,
          actorRole: e.actorRole,
          action: e.action,
          targetType: e.targetType,
          targetId: e.targetId?.toString() ?? null,
          metadata: e.metadata ?? {},
          createdAt: e.createdAt,
        })),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }));
  }
}