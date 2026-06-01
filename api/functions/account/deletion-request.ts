/**
 * Reviewee deletion-request endpoints.
 *
 * POST /api/account/deletion-request ... create
 * POST /api/account/deletion-request/:id/confirm ... public via token
 * POST /api/account/deletion-request/:id/cancel ... auth
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import crypto from "node:crypto";
import {ObjectId} from "mongodb";
import {DATA_DELETION_CONFIRM_TTL_HOURS, DATA_DELETION_GRACE_DAYS, type DeletionScope,} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireUser} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {sendDeletionCancelledEmail, sendDeletionConfirmedEmail, sendDeletionRequestedEmail,} from "../../src/email.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = (req.query.requestId ?? "").toString();
  const action = (req.query.action ?? "").toString();
  if (requestId && action === "confirm") return confirm(req, res, requestId);
  if (requestId && action === "cancel") return cancel(req, res, requestId);
  if (req.method === "GET") return current(req, res);
  if (req.method === "POST") return create(req, res);
  return res.status(405).json({success: false, error: "Method not allowed"});
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

async function current(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();
  const doc = await db
    .collection("data_requests")
    .findOne(
      {userId: user._id, type: "deletion", status: {$in: ["pending", "processing"]}},
      {sort: {requestedAt: -1}},
    );
  if (!doc) {
    return res.status(200).json({success: true, data: {request: null}});
  }

  return res.status(200).json({
    success: true,
    data: {
      request: {
        _id: String(doc._id ?? ""),
        userId: String(doc.userId ?? user._id),
        type: "deletion",
        status: String(doc.status ?? "pending"),
        deletion: {
          scope: doc.deletion?.scope === "data_only" ? "data_only" : "full",
          retainAnonymizedStats: !!doc.deletion?.retainAnonymizedStats,
          confirmedAt: toIso(doc.deletion?.confirmedAt),
          scheduledFor: toIso(doc.deletion?.scheduledFor),
          executedAt: toIso(doc.deletion?.executedAt),
          cancelledAt: toIso(doc.deletion?.cancelledAt),
          cancelledBy:
            doc.deletion?.cancelledBy === "admin" || doc.deletion?.cancelledBy === "user"
            ? doc.deletion.cancelledBy
            : null,
        },
        requestedAt: toIso(doc.requestedAt),
        updatedAt: toIso(doc.updatedAt),
        processedBy: doc.processedBy ? String(doc.processedBy) : null,
      },
    },
  });
}

async function create(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if ((user.role ?? "reviewee") === "admin") {
    return res.status(403).json({
      success: false,
      error: "Admin accounts cannot self-delete. Use the admin user panel.",
    });
  }

  const {scope, retainAnonymizedStats, password} = (req.body ?? {}) as {
    scope?: DeletionScope;
    retainAnonymizedStats?: boolean;
    password?: string;
  };
  if (scope !== "full" && scope !== "data_only") {
    return res.status(400).json({success: false, error: "Invalid scope."});
  }

  const userAuth = (user as {auth?: {passwordHash?: string | null; hasPassword?: boolean}})
    .auth;
  const passwordHash =
    userAuth?.passwordHash ?? (user as {passwordHash?: string}).passwordHash ?? null;
  const hasPassword = !!(userAuth?.hasPassword || passwordHash);
  if (hasPassword) {
if (!password) {
  return res.status(400).json({
    success: false,
    error: "Password is required to request deletion.",
  });
}

if (!passwordHash || !(await bcrypt.verify(password, passwordHash))) {
  return res.status(401).json({success: false, error: "Incorrect password."});
}

const db = await getDb();

// Prevent multiple in-flight deletion requests.
const existing = await db.collection("data_requests").findOne({
  userId: user._id,
  type: "deletion",
  status: {$in: ["pending", "processing"]},
});

if (existing) {
  return res.status(409).json({
    success: false,
    error: "You already have an in-flight deletion request.",
  });
}

const now = new Date();
const scheduledFor = new Date(
  now.getTime() + DATA_DELETION_GRACE_DAYS * 24 * 60 * 60_000,
);

const confirmationToken = crypto.randomBytes(32).toString("base64url");
const confirmationExpiresAt = new Date(
  now.getTime() + DATA_DELETION_CONFIRM_TTL_HOURS * 60 * 60_000,
);

const insert = await db.collection("data_requests").insertOne({
  userId: user._id,
  type: "deletion",
  status: "pending",
  deletion: {
    scope,
    retainAnonymizedStats: !!retainAnonymizedStats,
    confirmationToken,
    confirmationExpiresAt,
    confirmedAt: null,
    scheduledFor,
    executedAt: null,
    cancelledAt: null,
    cancelledBy: null,
  },
  requestedAt: now,
  updatedAt: now,
  processedBy: null,
});

await db.collection("users").updateOne({
  _id: user._id,
  $set: {"dataRequests.pendingDeletionId": insert.insertId},
});

const confirmUrl = `${APP_URL}/account/deletion-confirm?id=${insert.insertId.toString()}&token=${confirmationToken}`;
const cancelUrl = `${APP_URL}/settings`;

await sendDeletionRequestedEmail(user.email, {
  confirmUrl,
  cancelUrl,
  scheduledFor,
}).catch(() => undefined);

await logActivity(db, {
  actorId: user._id,
  actorRole: user.role ?? "reviewee",
  action: "data.deletion_requested",
  targetType: "data_request",
  targetId: insert.insertId,
  metadata: {scope, scheduledFor: scheduledFor.toISOString()},
});

return res.status(202).json({
  success: true,
  data: {
    requestId: insert.insertId.toString(),
    scheduledFor: scheduledFor.toISOString(),
    message:
      "Check your email to confirm. Deletion will execute 7 days after confirmation.",
    },
  });
}

async function confirm(req: VercelRequest, res: VercelResponse, id: string) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid id."});
  }

  const {token} = (req.body ?? {}) as {token?: string};
  if (!token) {
    return res.status(400).json({success: false, error: "Missing token."});
  }

  const db = await getDb();
  const doc = await db
    .collection("data_requests")
    .findOne({_id: new ObjectId(id), type: "deletion"});
if (!doc) return res.status(404).json({success: false, error: "Not found."});
if (doc.deletion?.confirmationToken !== token) {
  return res.status(401).json({success: false, error: "Invalid token."});
}
if (doc.deletion?.confirmationExpiresAt && new Date(doc.deletion.confirmationExpiresAt).getTime() < Date.now()) {
  return res.status(410).json({success: false, error: "Confirmation expired."});
}
if (doc.deletion?.confirmedAt) {
  return res.status(200)
  .json({
    success: true,
    data: {confirmed: true, scheduledFor: doc.deletion.scheduledFor},
  });
}
const now = new Date();
await db.collection("data_requests").updateOne(
  {_id: doc._id},
  {
    $set: {
      status: "processing",
      updatedAt: now,
      "deletion.confirmedAt": now,
    },
  },
);

const user = await db.collection("users").findOne({_id: doc.userId});
if (user?.email) {
  await sendDeletionConfirmedEmail(user.email, doc.deletion.scheduledFor).catch(
    () => undefined,
  );
}

await logActivity(db, {
  actorId: doc.userId,
  actorRole: "reviewee",
  action: "data.deletion_confirmed",
  targetType: "data_request",
  targetId: doc._id,
});
return res.status(200).json({
  success: true,
  data: {
    confirmed: true,
    scheduledFor: doc.deletion.scheduledFor?.toISOString?.() ?? null,
  },
});
}

async function cancel(req: VercelRequest, res: VercelResponse, id: string) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid id."});
  }
  const db = await getDb();
  const isAdmin = (user.role ?? "reviewee") === "admin";
  const filter: Record<string, unknown> = {_id: new ObjectId(id), type: "deletion"};
  if (!isAdmin) filter.userId = user._id;

  const doc = await db.collection("data_requests").findOne(filter);
  if (!doc) return res.status(404).json({success: false, error: "Not found."});
  if (!["pending", "processing"].includes(doc.status) || doc.deletion?.executedAt) {
    return res.status(400).json({success: false, error: "Cannot cancel this request."});
  }
  const now = new Date();
  await db.collection("data_requests").updateOne(
    {_id: doc._id},
    {
      $set: {
        status: "cancelled",
        updatedAt: now,
        "deletion.cancelledAt": now,
        "deletion.cancelledBy": isAdmin ? "admin" : "user",
      },
    },
  );
  await db.collection("users")
    .updateOne({_id: doc.userId}, {$unset: {"dataRequests.pendingDeletionId": ""}});

  const owner = await db.collection("users").findOne({_id: doc.userId});
  if (owner?.email) {
    await sendDeletionCancelledEmail(owner.email).catch(() => undefined);
  }
  await logActivity(db, {
    actorId: user._id,
    actorRole: user.role ?? "reviewee",
    action: "data.deletion_cancelled",
    targetType: "data_request",
    targetId: doc._id,
    metadata: {cancelledBy: isAdmin ? "admin" : "user"},
  });
  return res.status(200).json({success: true, data: {cancelled: true}});
}