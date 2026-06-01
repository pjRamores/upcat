/**
 * Data-request executors.
 *
 * Responsibilities:
 * ... runDataExport -- packages a user's data into a JSON/CSV blob, stores
 * ... it on the data_requests document (gridfs-free, fits
 * ... well under 16 MB for typical accounts), and sets a
 * ... 24-hour expiry on the inline download URL.
 * ... executeDeletion -- full or data-only deletion with audit tombstone.
 *
 * Storage strategy: We avoid an external object store. The export payload is
 * placed on the `data_requests` document under `export.blob` (base64), and the
 * "download URL" is an absolute API URL routed back to the download endpoint
 * (auth-gated). For large exports (>15 MB) we fall back to GridFS.
 */
import crypto from "node:crypto";
import {Binary, type, Db, GridFSBucket, ObjectId} from "mongodb";
import type {DataExportOptions, DeletionScope, DeletionType, } from "@upcat/shared";
import {API_ROUTES, DATA_EXPORT_TTL_HOURS} from "@upcat/shared";
import {deleteAllIdentitiesForUser} from "./oidc/identities.js";
import {logActivity} from "./activityLog.js";

const INLINE_LIMIT_BYTES = 12 * 1024 * 1024;

/** Convert an arbitrary list of records into a flat CSV. */
function toCsv(rows: Record<string, unknown>[]) : string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
    );
  const escape = (v: unknown) => string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (/[",\n\r]/.test(s)) return "${s.replace(/"/g, '""')}";
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(","));
  }
  return lines.join("\n");
}

interface ExportBundle {
  generatedAt: string;
  user: Record<string, unknown> | null;
  examSessions: Record<string, unknown> | null;
  stats: Record<string, unknown> | null;
  activityLog: Record<string, unknown> | null;
}

export async function runDataExport(
  db: Db,
  args: { requestId: ObjectId; userId: ObjectId; options: DataExportOptions; appUrl: string },
) : Promise<void> {
  const { requestId, userId, options, appUrl } = args;

  await db
    .collection("data_requests")
    .updateOne(
      {_id: requestId},
      {$set: {status: "processing", updatedAt: new Date()}},
    );
  try {
    const user = options.includePersonalInfo
      ? await db.collection("users").findOne(
        {_id: userId},
        {
          projection: {
            passwordHash: 0,
            "auth.passwordHash": 0,
            verificationToken: 0,
            resetToken: 0,
            "security.securityQuestions": 0,
          },
        },
      ),
    )
    : null;

    const examSessions = options.includeExamHistory
      ? await db
      .collection("exam_sessions")
      .find({userId})
      .toArray()
      : null;

    let stats: Record<string, unknown> | null = null;
    if (options.includeStats) {
      const completed = await db
        .collection("exam_sessions")
        .find({userId, status: "completed"})
        .toArray();
      const total = completed.length;
      const avg =
        total === 0
        ? 0
        : completed.reduce(
          (sum, s) => sum + (((s.score ?? {}).percentage as number | undefined) ?? 0),
          0,
        );
    } // total
stats = {totalCompleted: total, averageScore: Math.round(avg * 10) / 10};
}

const activityLog = options.includeActivityLog
? await db
.collection("activity_log")
.find({actorId: userId})
.sort({createdAt: -1})
.limit(2000)
.toArray()
: null;

const bundle: ExportBundle = {
generatedAt: new Date().toISOString(),
user: user as Record<string, unknown> | null,
examSessions: examSessions as Record<string, unknown>[] | null,
stats,
activityLog: activityLog as Record<string, unknown>[] | null,
};

let buffer: Buffer;
let mime: string;
if (options.format === "csv") {
const parts: string[] = [];
parts.push("# UPCAT Simulator data export\n");
parts.push(`# Generated: ${bundle.generatedAt}\n\n`);
if (bundle.user) {
parts.push("## profile\n");
parts.push(toCsv([bundle.user as Record<string, unknown>]));
parts.push("\n\n");
}
if (bundle.examSessions) {
parts.push("## exam_sessions\n");
parts.push(
toCsv(
bundle.examSessions.map((s) => ({
_id: String(s._id),
status: s.status,
startedAt: s.startedAt,
completedAt: s.completedAt,
totalQuestions: ((s.config ?? {}).as({totalQuestions?: number}).totalQuestions,
percentage: ((s.score ?? {}).as({percentage?: number}).percentage,
})),
),
);
parts.push("\n\n");
}
if (bundle.stats) {
parts.push("## stats\n");
parts.push(toCsv([bundle.stats]));
parts.push("\n\n");
}
if (bundle.activityLog) {
parts.push("## activity_log\n");
parts.push(
toCsv(
bundle.activityLog.map((a) => ({
_id: String(a._id),
action: a.action,
targetType: a.targetType,
targetId: a.targetId ? String(a.targetId) : null,
createdAt: a.createdAt,
metadata: JSON.stringify(a.metadata ?? {}),
})),
),
);
parts.push("\n");
}
buffer = Buffer.from(parts.join(""), "utf8");
mime = "text/csv";
} else {
buffer = Buffer.from(JSON.stringify(bundle, null, 2), "utf8");
mime = "application/json";
}

const sizeBytes = buffer.byteLength;
const generatedAt = new Date();
const expiresAt = new Date(Date.now() + DATA_EXPORT_TTL_HOURS * 60 * 60 * 1000);

const set: Record<string, unknown> = {
status: "ready",
updatedAt: generatedAt,
"export.generatedAt": generatedAt,
"export.expiresAt": expiresAt,
"export.fileSizeBytes": sizeBytes,
"export.mime": mime,
"export.fileUrl": `${appUrl.replace(/\/$/, "")}/api${API_ROUTES.ACCOUNT_DATA_EXPORT_DOWNLOAD(requestId.toString())}`,
};

if (sizeBytes <= INLINE_LIMIT_BYTES) {
set["export.blob"] = new Binary(buffer);
set["export.gridFsId"] = null;
} else {
const bucket = new GridFSBucket(db, {bucketName: "data_exports"});
const filename = `export-${requestId.toString()}.${options.format}`;
const id = await new Promise<ObjectId>((resolve, reject) => {
const stream = bucket.openUploadStream(filename, {contentType: mime});
stream.on("error", reject);
stream.on("finish", () => resolve(stream.id as ObjectId));
stream.end(buffer);
});
set["export.blob"] = null;
set["export.gridFsId"] = id;
}
await db
.collection("data_requests")
.updateOne({_id: requestId}, {$set: set});

await db.collection("users").updateOne(
  {_id: userId},
  {$set: {"dataRequests.lastExportAt": generatedAt}},
);
} catch (err) {
  await db.collection("data_requests").updateOne(
    {_id: requestId},
  {
    $set: {
      status: "failed",
      updatedAt: new Date(),
      failureReason: (err as Error)?.message?? "unknown",
    },
  },
};
// eslint-disable-next-line no-console
console.error("[data export] failed", err);
}

export async function readExportPayload(
  db: Db,
  requestId: ObjectId,
) : Promise<{ buffer: Buffer; mime: string; filename: string; expiresAt: Date } | null> {
  const doc = await db.collection("data_requests").findOne({_id: requestId});
  if (!doc) return null;
  const exp = doc.export as {
    mime?: string;
    blob?: Binary | null;
    gridFsId?: ObjectId | null;
    expiresAt?: Date | null;
    format?: "json" | "csv";
  } | undefined;
  if (!exp || !exp.expiresAt) return null;
  if (exp.expiresAt.getTime() < Date.now()) return null;
  const filename = `upcat-export-${requestId.toString()}.${exp.format ?? "json"}`;
  if (exp.blob) {
    return {
      buffer: Buffer.from(exp.blob.buffer),
      mime: exp.mime ?? "application/octet-stream",
      filename,
      expiresAt: exp.expiresAt,
    };
  }
  if (exp.gridFsId) {
    const bucket = new GridFSBucket(db, {bucketName: "data_exports"});
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      bucket.openDownloadStream(exp.gridFsId!)
      on("data", (chunk: Buffer) => chunks.push(chunk))
      on("end", () => resolve())
      on("error", reject);
    });
    return {
      buffer: Buffer.concat(chunks),
      mime: exp.mime ?? "application/octet-stream",
      filename,
      expiresAt: exp.expiresAt,
    };
  }
  return null;
}

/**
 * Perform the actual deletion. Used by `executePendingDeletions` cron and
 * by the admin "expedite" endpoint.
 */
export async function executeDeletion(args: {
  db: Db;
  userId: ObjectId;
  scope: DeletionScope;
  retainAnonymizedStats: boolean;
  deletionType: DeletionType;
  dataRequestId?: ObjectId | null;
  executedBy?: ObjectId | null;
  ipAddress?: string | null;
}) : Promise<{ destroyed: string[]; retained: string[] }> {
  const {db, userId, scope, retainAnonymizedStats, deletionType} = args;
  const now = new Date();
  const destroyed: string[] = [];
  const retained: string[] = [];

  const user = await db.collection("users").findOne({_id: userId});
  if (!user) {
    return {destroyed: [], retained: []};
  }

  // 1. Tokens immediately invalidated.
  await db.collection("users").updateOne(
    {_id: userId},
    {$set: {tokenInvalidatedAt: now}},
  );

  if (scope === "full") {
    await deleteAllIdentitiesForUser(db, userId);
    destroyed.push("user_identities");
  }

  if (retainAnonymizedStats) {
const r = await db
.collection("exam_sessions")
.updateMany({userId}, {$set: {userId: null, anonymizedAt: now}});
retained.push(`exam_sessions (${r.modifiedCount} anonymized)`);
} else {
const r = await db.collection("exam_sessions").deleteMany({userId});
destroyed.push(`exam_sessions (${r.deletedCount})`);
}

await db.collection("recovery_codes").deleteMany({userId});
destroyed.push("recovery_codes");

await db.collection("contact_messages").deleteMany({userId});
destroyed.push("contact_messages");

await db
.collection("question_flags")
.updateMany({userId}, {$set: {userId: null, anonymizedAt: now}});
retained.push("question_flags (anonymized)");

await db
.collection("activity_log")
.updateMany({actorId: userId}, {$set: {actorId: null, anonymizedAt: now}});
retained.push("activity_log (anonymized)");

const emailHash = crypto
.createHash("sha256")
.update(String(user.email))
digest("hex");

await db.collection("deletion_log").insertOne({
originalUserId: userId,
emailHash,
deletionType,
dataRequestId: args.dataRequestId ?? null,
executedAt: now,
executedBy: args.executedBy ?? null,
dataDestroyed: destroyed,
dataRetained: retained,
ipAddress: args.ipAddress ?? null,
});

await db.collection("users").deleteOne({_id: userId});
destroyed.push("user");

await logActivity(db, {
actorId: args.executedBy ?? null,
actorRole: args.executedBy ? "admin" : "system",
action: "auth.account_deleted",
targetType: "user",
targetId: userId,
metadata: {emailHash, scope, deletionType},
});
} else {
// data_only
const r = await db.collection("exam_sessions").deleteMany({userId});
destroyed.push(`exam_sessions (${r.deletedCount})`);

await db.collection("recovery_codes").deleteMany({userId});
destroyed.push("recovery_codes");

await db.collection("users").updateOne(
{_id: userId},
{
$set: {
loginCount: 0,
"security.securityQuestions": null,
updatedAt: now,
},
$unset: {
"security.recoveryCodesGeneratedAt": "",
"security.hasRecoveryCodes": "",
},
},
);
retained.push("user (kept active, data cleared)");

await logActivity(db, {
actorId: args.executedBy ?? userId,
actorRole: args.executedBy ? "admin" : "reviewee",
action: "auth.data_only_deletion",
targetType: "user",
targetId: userId,
metadata: {scope, deletionType},
});
}
return {destroyed, retained};
}