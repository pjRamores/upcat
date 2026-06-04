/**
 * Support-ticket helpers: monotonic ticket number generation and DTO mapping.
 */
import { type Db, ObjectId, type WithId } from "mongodb";
import type {
  SupportTicket,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketResolution,
  SupportTicketStatus,
  SupportTicketType,
  SupportTicketVerification,
} from "@upcat/shared";

export interface SupportTicketDoc {
  id: ObjectId;
  ticketNumber: string;
  userId: ObjectId | null;
  requesterEmail: string;
  type: SupportTicketType;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  subject: string;
  description: string;
  verification: {
    method: "email_otp" | "security_questions" | "document_upload" | "admin_override";
    status: "pending" | "verified" | "failed";
    verifiedAt: Date | null;
    verifiedBy: ObjectId | null;
    attempts: number;
    evidence: {
      type: string;
      description: string;
      uploadedAt: Date;
      fileRef: string | null;
    }[];
  };
  resolution: {
    action: string | null;
    notes: string | null;
    resolvedBy: ObjectId | null;
    resolvedAt: Date | null;
  };
  messages: {
    _id: ObjectId;
    sender: "user" | "admin" | "system";
    senderName: string;
    content: string;
    createdAt: Date;
    isInternal: boolean;
  }[];
  assignedTo: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Atomically allocate the next 'SUP-NNNNNN' number. Uses the 'counters' collection with '$inc' upsert to avoid races.
 */
export async function nextTicketNumber(db: Db): Promise<string> {
  // Untyped collection avoids the strict _id ObjectId requirement; we use a stable string key for the counter document.
  const col = db.collection("counters");
  await col.updateOne(
    { _id: "support_ticket" as unknown as ObjectId },
    { $inc: { value: 1 } },
    { upsert: true },
  );
  const doc = await col.findOne<{ value?: number }>({ _id: "support_ticket" as unknown as ObjectId });
  const value = doc?.value ?? 1;
  return `SUP-${String(value).padStart(6, "0")}`;
}

export function emptyVerification(
  method: SupportTicketVerificationDocMethod = "email_otp",
): SupportTicketDoc["verification"] {
  return {
    method,
    status: "pending",
    verifiedAt: null,
    verifiedBy: null,
    attempts: 0,
    evidence: [],
  };
}

type SupportTicketVerificationDocMethod = SupportTicketDoc["verification"]["method"];

export function emptyResolution(): SupportTicketDoc["resolution"] {
  return { action: null, notes: null, resolvedBy: null, resolvedAt: null };
}

export function systemMessage(content: string): SupportTicketDoc["messages"][number] {
  return {
    _id: new ObjectId(),
    sender: "system",
    senderName: "System",
    content,
    createdAt: new Date(),
    isInternal: false,
  };
}
export function toSupportTicketDTO(
    doc: WithId<SupportTicketDoc>,
    opts: { includeInternal: boolean; assignedToName?: string | null },
): SupportTicket {
    const messages: SupportTicketMessage[] = doc.messages
        .filter((m) => opts.includeInternal || !m.isInternal)
        .map((m) => ({
            id: m._id.toString(),
            sender: m.sender,
            senderName: m.senderName,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
            isInternal: m.isInternal,
        }));
    const verification: SupportTicketVerification = {
        method: doc.verification.method,
        status: doc.verification.status,
        verifiedAt: doc.verification.verifiedAt?.toISOString() ?? null,
        verifiedBy: doc.verification.verifiedBy?.toString() ?? null,
        attempts: doc.verification.attempts,
        evidence: doc.verification.evidence.map((e) => ({
            type: e.type,
            description: e.description,
            uploadedAt: e.uploadedAt.toISOString(),
            fileRef: e.fileRef,
        })),
    };
    const resolution: SupportTicketResolution = {
        action: doc.resolution.action,
        notes: doc.resolution.notes,
        resolvedBy: doc.resolution.resolvedBy?.toString() ?? null,
        resolvedAt: doc.resolution.resolvedAt?.toISOString() ?? null,
    };
    return {
        _id: doc._id.toString(),
        ticketNumber: doc.ticketNumber,
        userId: doc.userId?.toString() ?? null,
        requesterEmail: doc.requesterEmail,
        type: doc.type,
        status: doc.status,
        priority: doc.priority,
        subject: doc.subject,
        description: doc.description,
        verification,
        resolution,
        messages,
        assignedTo: doc.assignedTo?.toString() ?? null,
        assignedToName: opts.assignedToName ?? null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}