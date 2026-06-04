/**
 * Phase 15 - Security event logging.
 *
 * Centralized append-only log for every security-relevant signal. Inserts are intentionally fire-and-forget (we never want logging to break a legitimate request) -- callers may `await` the returned promise for tests or audit guarantees, but production handlers usually don't.
 */
import { type Db, ObjectId } from "mongodb";
import type {
  SecurityEventAction,
  SecurityEventSource,
  SecurityEventTarget,
  SecurityEventType,
  SecuritySeverity,
} from "@upcat/shared";
import { getDb } from "../db.js";

export interface LogEventInput {
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: Partial<SecurityEventSource> & { ip: string };
  target?: Partial<SecurityEventTarget>;
  details?: Record<string, unknown>;
  action?: Partial<SecurityEventAction>;
}

export async function logSecurityEvent(input: LogEventInput): Promise<ObjectId | null> {
  try {
    const db = await getDb();
    return await insertEvent(db, input);
  } catch {
    // Logging must never throw -- but surface to stderr in dev.
    return null;
  }
}

/** Internal -- used when we already have a `Db` handle (avoids extra await). */
export async function insertEvent(db: Db, input: LogEventInput): Promise<ObjectId> {
  const now = new Date();
  const doc = {
    _id: new ObjectId(),
    timestamp: now,
    type: input.type,
    severity: input.severity,
    source: {
      ip: input.source.ip,
      userId: input.source.userId
        ? typeof input.source.userId === "string"
          ? new ObjectId(input.source.userId)
          : (input.source.userId as ObjectId)
        : null,
      userAgent: input.source.userAgent ?? null,
      fingerprint: input.source.fingerprint ?? null,
      country: input.source.country ?? null,
    },
    target: {
      type: input.target?.type ?? null,
      value: input.target?.value ?? null,
    },
    details: input.details ?? {},
    action: {
      taken: input.action?.taken ?? null,
      automated: input.action?.automated ?? true,
    },
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
    notes: null,
  };
  await db.collection("security_events").insertOne(doc);
  return doc._id;
}