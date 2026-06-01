/**
 * GET /api/admin/data-requests
 * PUT /api/admin/data-requests/:id
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import type {DataRequestStatus, DataRequestType} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireAdmin} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {executeDeletion} from "../../src/dataRequests.js";
import {sendDeletionCancelledEmail, sendDeletionExecutedEmail,} from "../../src/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = (req.query.id ?? "").toString();
  if (req.method === "GET") return list(req, res);
  if (req.method === "PUT" && id) return update(req, res, id, admin);
  return res.status(405).json({success: false, error: "Method not allowed"});
}

async function list(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  const type = (req.query.type ?? "").toString();
  if (type === "export" || type === "deletion") filter.type = type as DataRequestType;
  const status = (req.query.status ?? "").toString();
  if (status) filter.status = status as DataRequestStatus;
  const userId = (req.query.userId ?? "").toString();
  if (userId && ObjectId.isValid(userId)) filter.userId = new ObjectId(userId);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));

  const total = await db.collection("data_requests").countDocuments(filter);
  const items = await db
    .collection("data_requests")
    .find(filter)
    .sort({requestedAt: -1})
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  // Lookup user emails for display.
  const ids = Array.from(
    new Set(items.map((d) => d.userId?.toString()).filter((s): s.is_string => !!s)),
    ).map((s) => new ObjectId(s));
  const users =
    ids.length === 0
    ? []
    : await db
    .collection("users")
    .find({_id: {$in: ids}})
    .project({email: 1, firstName: 1, lastName: 1})
    .toArray();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return res.status(200).json({
    success: true,
    data: {
      items: items.map((d) => ({
        _id: d._id.toString(),
        userId: d.userId?.toString() ?? null,
        userEmail: userMap.get(d.userId?.toString() ?? "")?.email ?? null,
        type: d.type,
        status: d.status,
        export: d.export
      }? {
        format: d.export.format,
        fileSizeBytes: d.export.fileSizeBytes,
        generatedAt: d.export.generatedAt?.toISOString?.() ?? null,
        expiresAt: d.export.expiresAt?.toISOString?.() ?? null,
      }
      : null,
      deletion: d.deletion
    }? {
      scope: d.deletion.scope,
      retainAnonymizedStats: d.deletion.retainAnonymizedStats,
      scheduledFor: d.deletion.scheduledFor?.toISOString?.() ?? null,
      confirmedAt: d.deletion.confirmedAt?.toISOString?.() ?? null,
      executedAt: d.deletion.executedAt?.toISOString?.() ?? null,
      cancelledAt: d.deletion.cancelledAt?.toISOString?.() ?? null,
      }
      : null,
      requestedAt: d.requestedAt?.toISOString?.() ?? null,
      updatedAt: d.updatedAt?.toISOString?.() ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

async function update(
  req: VercelRequest,
  res: VercelResponse,
  id: string,
  admin: {_id: ObjectId; email: string},
) {
  if (!ObjectId.isValid(id)) {
    return res.status(405).json({success: false, error: "Invalid id."});
  }
}
const {action, notes} = (req.body??{}).as({
  action?: "cancel" | "expedite";
  notes?: string;
});
const db = await getDb();
const doc = await db
  .collection("data_requests")
  .findOne({_id: new ObjectId(id)});
if (!doc) return res.status(404).json({success: false, error: "Not found."});

if (action === "cancel") {
  if (doc.deletion?.executedAt) {
    return res
      .status(400)
      .json({success: false, error: "Already executed; cannot cancel."});
  }
  const now = new Date();
  await db.collection("data_requests").updateOne(
    {_id: doc._id},
    {
      $set: {
        status: "cancelled",
        updatedAt: now,
        "deletion.cancelledAt": now,
        "deletion.cancelledBy": "admin",
        processedBy: admin._id,
        adminNotes: notes??null,
      },
    },
  );
  await db
    .collection("users")
    .updateOne(
      {_id: doc.userId},
      {$unset: {"dataRequests.pendingDeletionId": ""}},
    );
  const owner = await db.collection("users").findOne({_id: doc.userId});
  if (owner?.email) {
    sendDeletionCancelledEmail(owner.email).catch(() => undefined);
  }
  await logActivity(db, {
    actorId: admin._id,
    actorRole: "admin",
    action: "data.deletion_cancelled",
    targetType: "data_request",
    targetId: doc._id,
    metadata: {cancelledBy: "admin", notes: notes??null},
  });
  return res.status(200).json({success: true, data: {cancelled: true}});
}

if (action === "expedite") {
  if (doc.type !== "deletion") {
    return res
      .status(400)
      .json({success: false, error: "Only deletion requests can be expedited."});
    }
    if (!doc.deletion?.confirmedAt) {
      return res.status(400).json({
        success: false,
        error: "Cannot expedite an unconfirmed deletion request.",
      });
    }
    const owner = await db.collection("users").findOne({_id: doc.userId});
    const ownerEmail = owner?.email as string | undefined;

    const result = await executeDeletion({
      db,
      userId: doc.userId,
      scope: doc.deletion.scope,
      retainAnonymizedStats: !!doc.deletion.retainAnonymizedStats,
      deletionType: "admin_initiated",
      dataRequestId: doc._id,
      executedBy: admin._id,
    });
    await db.collection("data_requests").updateOne(
      {_id: doc._id},
      {
        $set: {
          status: "completed",
          updatedAt: new Date(),
          "deletion.executedAt": new Date(),
          processedBy: admin._id,
          adminNotes: notes??null,
        },
      },
    );
    if (ownerEmail) {
      sendDeletionExecutedEmail(ownerEmail).catch(() => undefined);
    }
    return res
      .status(200)
      .json({success: true, data: {expedited: true, result}});
  }
}