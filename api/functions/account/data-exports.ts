/**
 * Reviewee data-export endpoints.
 *
 * POST /api/account/data-export
 * GET /api/account/data-export/:requestId
 * GET /api/account/data-export/:requestId/download
 */

import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {DATA_EXPORT_TTL_HOURS, type DataExportOptions, type ExportFormat,} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireUser} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {readExportPayload, runDataExport} from "../../src/dataRequests.js";
import {sendDataExportReadyEmail} from "../../src/email.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const EXPORT_RATE_LIMIT_MS = 24 * 60 * 60_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const requestId = (req.query.requestId ?? "").toString();
  const download = (req.query.download ?? "") === "1";
  if (requestId && download) return doDownload(req, res, user._id, requestId);
  if (requestId) return getStatus(req, res, user._id, requestId);
  if (req.method === "GET") return listRequests(res, user._id);
  if (req.method === "POST") return createRequest(req, res, user._id, user.email);
  return res.status(405).json({success: false, error: "Method not allowed"});
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function toExportRequestShape(doc: Record<string, unknown>) {
  const exportBlock = (doc.export ?? {}).as Record<string, unknown>;
  return {
    _id: String(doc._id ?? ""),
    userId: String(doc.userId ?? ""),
    type: "export",
    status: String(doc.status ?? "pending"),
    export: {
      format: exportBlock.format === "csv" ? "csv" : "json",
      includeExamHistory: exportBlock.includeExamHistory !== false,
      includeStats: exportBlock.includeStats !== false,
      includePersonalInfo: exportBlock.includePersonalInfo !== false,
      includeActivityLog: !!exportBlock.includeActivityLog,
      fileUrl: (exportBlock.fileUrl as string | null) ?? null,
      fileSizeBytes: (exportBlock.fileSizeBytes as number | null) ?? null,
      generatedAt: toIso(exportBlock.generatedAt),
      expiresAt: toIso(exportBlock.expiresAt),
    },
    requestedAt: toIso(doc.requestedAt),
    updatedAt: toIso(doc.updatedAt),
    processedBy: doc.processedBy ? String(doc.processedBy) : null,
  };
}

async function listRequests(res: VercelResponse, userId: ObjectId) {
  const db = await getDb();
  const docs = await db
    .collection("data_requests")
    .find({userId, type: "export"})
    .sort({requestedAt: -1})
    .limit(20)
    .toArray();

  return res.status(200).json({
    success: true,
    data: {
      requests: docs.map((doc) => toExportRequestShape(doc as unknown as Record<string, unknown>)),
    },
  });
}

async function createRequest(
  req: VercelRequest,
  res: VercelResponse,
  userId: ObjectId,
  userEmail: string,
) {
  const body = (req.body ?? {}).as Partial<DataExportOptions>;
  const format: ExportFormat = body.format === "csv" ? "csv" : "json";
  const options: DataExportOptions = {
    format,
    includeExamHistory: body.includeExamHistory !== false,
    includeStats: body.includeStats !== false,
    includePersonalInfo: body.includePersonalInfo !== false,
    includeActivityLog: !!body.includeActivityLog,
  };

  const db = await getDb();
  // 1 export per 24 hours
  const recent = await db.collection("data_requests").findOne(
    {
      userId,
      type: "export",
      requestedAt: {$gte: new Date(Date.now()) - EXPORT_RATE_LIMIT_MS},
    },
    {
      sort: {requestedAt: -1},
    }
  );
}
if (recent) {
  return res.status(429).json({
    success: false,
    error: "You already requested an export within the last 24 hours.",
  });
}

const now = new Date();
const insert = await db.collection("data_requests").insertOne({
  userId,
  type: "export",
  status: "pending",
  export: {
    ...options,
    fileUrl: null,
    fileSizeBytes: null,
    generatedAt: null,
    expiresAt: null,
  },
  deletion: null,
  requestedAt: now,
  updatedAt: now,
  processedBy: null,
});

await logActivity(db, {
  actorId: userId,
  actorRole: "reviewee",
  action: "data.export_requested",
  targetType: "data_request",
  targetId: insert.insertId,
  metadata: {format},
});

// Process inline. On serverless, this completes within the request budget
// for typical accounts (<12 MB output). Email is fired after completion.
runDataExport(db, {
  requestId: insert.insertId,
  userId,
  options,
  appUrl: APP_URL,
})
then (async () => {
  const fresh = await db
    .collection("data_requests")
    .findOne({_id: insert.insertId});
  const exp = (fresh?.export ?? {}) as {
    fileUrl?: string;
    expiresAt?: Date;
    format?: string;
  };
  if (fresh?.status === "ready" && exp.fileUrl && exp.expiresAt) {
    await sendDataExportReadyEmail(userEmail, {
      downloadUrl: exp.fileUrl,
      expiresAt: exp.expiresAt,
      format: exp.format ?? format,
    }).catch(() => undefined);
  }
})
catch ((err) => {
  // eslint-disable-next-line no-console
  console.error("[data export] post-process failed", err);
})
return res.status(202).json({
  success: true,
  data: {
    requestId: insert.insertId.toString(),
    status: "pending",
    message: "You'll receive an email when your export is ready.",
  },
})
}

async function getStatus(
  _req: VercelRequest,
  res: VercelResponse,
  userId: ObjectId,
  requestId: string,
) {
  if (!ObjectId.isValid(requestId)) {
    return res.status(400).json({success: false, error: "Invalid request id."});
  }
  const db = await getDb();
  const doc = await db
    .collection("data_requests")
    .findOne({_id: new ObjectId(requestId), userId, type: "export"});
  if (!doc) return res.status(404).json({success: false, error: "Not found."});
  return res.status(200).json({
    success: true,
    data: {
      _id: doc._id.toString(),
      status: doc.status,
      export: {
        format: doc.export?.format ?? null,
        fileUrl: doc.export?.fileUrl ?? null,
        fileSizeBytes: doc.export?.fileSizeBytes ?? null,
        generatedAt: doc.export?.generatedAt?.toISOString() ?? null,
        expiresAt: doc.export?.expiresAt?.toISOString() ?? null,
        ttlHours: DATA_EXPORT_TTL_HOURS,
      },
      requestedAt: doc.requestedAt?.toISOString() ?? null,
    },
  });
}
async function doDownload(
  _req: VercelRequest,
  res: VercelResponse,
  userId: ObjectId,
  requestId: string,
) {
  if (!ObjectId.isValid(requestId)) {
    return res.status(400).json({success: false, error: "Invalid request id."});
  }
  const db = await getDb();
  const doc = await db
    .collection("data_requests")
    .findOne({_id: new ObjectId(requestId), userId, type: "export"});
  if (!doc || doc.status !== "ready") {
    return res.status(404).json({success: false, error: "Export not available."});
  }
  const payload = await readExportPayload(db, new ObjectId(requestId));
  if (!payload) {
    return res.status(410).json({success: false, error: "Export expired."});
  }
  await logActivity(db, {
    actorId: userId,
    actorRole: "reviewee",
    action: "data.export_downloaded",
    targetType: "data_request",
    targetId: new ObjectId(requestId),
  });
  res.setHeader("Content-Type", payload.mime);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${payload.filename}"`,
  );
  res.setHeader("Content-Length", String(payload.buffer.byteLength));
  res.status(200).end(payload.buffer);
}