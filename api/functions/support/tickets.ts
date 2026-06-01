/**
 * Reviewee-facing support endpoints.
 *
 * GET /api/support/tickets ...list current user's tickets
 * POST /api/support/tickets ...create ticket (auth)
 * GET /api/support/tickets/:ticketNumber ...fetch one
 * POST /api/support/tickets/:ticketNumber/messages ...reply
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_TYPES,
  type SupportTicketPriority,
  type SupportTicketType,
} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireUser} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {
  emptyResolution,
  emptyVerification,
  nextTicketNumber,
  type SupportTicketDoc,
  toSupportTicketDTO,
} from "../../src/support.js";
import {sendTicketReceivedEmail, sendTicketUpdateEmail,} from "../../src/email.js";
import {getPaymentConfig} from "../../src/paymentConfig.js";
import {isPremiumActive, normalizeSubscription} from "../../src/subscription.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticketNumber = (req.query.ticketNumber ?? "").toString();
  const messages = (req.query.messages ?? "") === "1";

  if (ticketNumber && messages) return postMessage(req, res, ticketNumber);
  if (ticketNumber) return getOne(req, res, ticketNumber);
  if (req.method === "POST") return create(req, res);
  if (req.method === "GET") return list(req, res);
  return res.status(405).json({success: false, error: "Method not allowed"});
}

async function list(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();
  const docs = await db
    .collection<SupportTicketDoc>("support_tickets")
    .find({userId: user._id})
    .sort({updatedAt: -1})
    .limit(100)
    .toArray();
  return res.status(200).json({
    success: true,
    data: {
      items: docs.map((d) => toSupportTicketDTO(d, {includeInternal: false})),
    },
  });
}

async function create(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const {type, subject, description, priority} = (req.body ?? {}) as {
    type?: SupportTicketType;
    subject?: string;
    description?: string;
    priority?: SupportTicketPriority;
  };
  if (!type || !SUPPORT_TICKET_TYPES.includes(type)) {
    return res.status(400).json({success: false, error: "Invalid ticket type."});
  }
  if (!subject || subject.trim().length < 3 || subject.length > 200) {
    return res.status(400)
      .json({success: false, error: "Subject must be 3-200 characters."});
  }
  if (!description || description.trim().length < 10 || description.length > 5000) {
    return res.status(400)
      .json({success: false, error: "Description must be 10-5000 characters."});
  }
  const finalPriority: SupportTicketPriority =
    priority && SUPPORT_TICKET_PRIORITIES.includes(priority) ? priority : "medium";

  const db = await getDb();
  const paymentConfig = await getPaymentConfig(db);
  const prioritySupportFeature = paymentConfig.featureGating.features.find(
    (f) => f.id === "priority_support",
  );
  const isPremium = isPremiumActive(normalizeSubscription(user as unknown as Record<string, unknown>));
  const effectivePriority: SupportTicketPriority =
    isPremium && prioritySupportFeature?.accessLevel !== "disabled" ? "high" : finalPriority;
  const ticketNumber = await nextTicketNumber(db);
  const now = new Date();
  const doc: Omit<SupportTicketDoc, "_id"> = {
    ticketNumber,
    userId: user._id,
    requesterEmail: user.email,
    type,
    status: "open",
    priority: effectivePriority,
  };
subject: subject.trim(),
description: description.trim(),
verification: emptyVerification(),
resolution: emptyResolution(),
messages: [
  {
    _id: new ObjectId(),
    sender: "user",
    senderName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    content: description.trim(),
    createdAt: now,
    isInternal: false,
  },
  ],
  assignedTo: null,
  createdAt: now,
  updatedAt: now,
  };
const inserted = await db.collection<SupportTicketDoc>("support_tickets").insertOne(doc as SupportTicketDoc);

await logActivity(db, {
  actorId: user._id,
  actorRole: user.role ?? "reviewee",
  action: "support.ticket_created",
  targetType: "ticket",
  targetId: inserted.insertedId,
  metadata: {ticketNumber, type, priority: effectivePriority},
});

sendTicketReceivedEmail(user.email, {ticketNumber, subject: doc.subject}).catch(
() => undefined,
);

return res
.status(201)
.json({success: true, data: {ticketNumber, ticketId: inserted.insertedId.toString()}});
}

async function getOne(req: VercelRequest, res: VercelResponse, ticketNumber: string) {
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();
  const doc = await db
    .collection<SupportTicketDoc>("support_tickets")
    .findOne({ticketNumber});
  if (!doc) {
    return res.status(404).json({success: false, error: "Ticket not found."});
  }
  const isAdmin = (user.role ?? "reviewee") === "admin";
  if (!isAdmin && doc.userId?.toString() !== user._id.toString()) {
    return res.status(403).json({success: false, error: "Forbidden."});
  }
  return res.status(200).json({
    success: true,
    data: toSupportTicketDTO(doc, {includeInternal: isAdmin}),
  });
}

async function postMessage(
req: VercelRequest,
res: VercelResponse,
ticketNumber: string,
) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();
  const doc = await db
    .collection<SupportTicketDoc>("support_tickets")
    .findOne({ticketNumber});
  if (!doc) {
    return res.status(404).json({success: false, error: "Ticket not found."});
  }
  const isAdmin = (user.role ?? "reviewee") === "admin";
  if (!isAdmin && doc.userId?.toString() !== user._id.toString()) {
    return res.status(403).json({success: false, error: "Forbidden."});
  }
  if (doc.status === "resolved" || doc.status === "rejected") {
    return res.status(400).json({success: false, error: "Ticket is closed."});
  }
  const {content, isInternal} = (req.body ?? {}) as {
    content?: string;
    isInternal?: boolean;
  };
  if (!content || content.trim().length < 1 || content.length > 5000) {
    return res
      .status(400)
      .json({success: false, error: "Reply must be 1-5000 characters."});
  }
  const now = new Date();
  const message = {
    _id: new ObjectId(),
    sender: (isAdmin ?? "admin") : "user") as "admin" | "user",
    senderName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    content: content.trim(),
    createdAt: now,
    isInternal: isAdmin ? !!isInternal : false,
  };
  // Auto-progress status: reviewee replied → "open" (if was awaiting_user)
  // admin replied & visible → "awaiting_user"
  const nextStatus =
    !message.isInternal && isAdmin
? "awaiting_user"
: !isAdmin && doc.status === "awaiting_user"
: ? "open"
: doc.status;

await db.collection<SupportTicketDoc>("support_tickets").updateOne(
  {_id: doc._id},
  {
    $push: {messages: message},
    $set: {updatedAt: now, status: nextStatus},
  },
);

// Notify the other party (unless internal).
if (!message.isInternal) {
  const previewUrl = `${APP_URL}/support/tickets/${ticketNumber}`;
  if (isAdmin && doc.requesterEmail) {
    sendTicketUpdateEmail(doc.requesterEmail, {
      ticketNumber,
      updateType: "reply",
      previewUrl,
      summary: "An admin replied to your support ticket.",
    }).catch(() => undefined);
  }
}

await logActivity(db, {
  actorId: user._id,
  actorRole: user.role ?? "reviewee",
  action: "support.message_posted",
  targetType: "ticket",
  targetId: doc._id,
  metadata: {ticketNumber, isInternal: message.isInternal},
});

return res.status(201).json({success: true, data: {posted: true}});
}