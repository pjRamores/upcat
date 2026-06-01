/**
 * Guest support submission for users locked out of authentication.
 * Includes a server-signed math CAPTCHA + honeypot field.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {SUPPORT_GUEST_RATE, SUPPORT_TICKET_TYPES, type SupportTicketType, } from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {isEmail, sanitizeText} from "../../src/security.js";
import {issueCaptcha, verifyCaptcha} from "../../src/captcha.js";
import {clientIp, rateLimit} from "../../src/oidc/rateLimit.js";
import {emptyResolution, emptyVerification, nextTicketNumber, type SupportTicketDoc, } from "../../src/support.js";
import {sendTicketReceivedEmail} from "../../src/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    // GET /api/support/captcha -- issue a new challenge.
    const c = issueCaptcha();
    return res.status(200).json({
      success: true,
      data: {
        token: c.token,
        question: c.question,
        expiresAt: c.expiresAt.toISOString(),
      },
    });
  }
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const limit = rateLimit({
    bucket: "support_guest",
    key: clientIp(req),
    limit: SUPPORT_GUEST_RATE.limit,
    windowMs: SUPPORT_GUEST_RATE.windowMs,
  });
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    return res
    .status(429)
    .json({success: false, error: "Too many submissions. Try again later."});
  }

  const body = (req.body ?? {}).as {
    email?: string;
    fullName?: string;
    type?: SupportTicketType;
    subject?: string;
    description?: string;
    captchaToken?: string;
    captchaAnswer?: string;
    website?: string;
  };

  // Honeypot -- bots fill the "website" field.
  if (body.website && body.website.trim().length > 0) {
    return res.status(200).json({success: true, data: {received: true}});
  }
  if (!isEmail(body.email)) {
    return res.status(400).json({success: false, error: "Valid email is required."});
  }
  const fullName = sanitizeText(body.fullName, 120);
  if (fullName.length < 2) {
    return res.status(400).json({success: false, error: "Full name is required."});
  }
  if (!body.type || !SUPPORT_TICKET_TYPES.includes(body.type)) {
    return res.status(400).json({success: false, error: "Invalid ticket type."});
  }
  const subject = sanitizeText(body.subject, 200);
  const description = sanitizeText(body.description, 5000);
  if (subject.length < 3 || description.length < 10) {
    return res
    .status(400)
    .json({success: false, error: "Subject and description are required."});
  }
  if (!verifyCaptcha(body.captchaToken ?? ""), body.captchaAnswer ?? "")) {
    return res.status(400).json({success: false, error: "Captcha check failed."});
  }

  const db = await getDb();
  const email = body.email!.toLowerCase().trim();
  const existingUser = await db.collection("users").findOne({email});
  const ticketNumber = await nextTicketNumber(db);
  const now = new Date();

  const doc: Omit<SupportTicketDoc, "_id"> = {
    ticketNumber,
    userId: (existingUser?._id as ObjectId | undefined) ?? null,
    requesterEmail: email,
    type: body.type,
    status: "open",
    priority: "high", // guest submissions skip the queue
    subject,
    description,
    verification: emptyVerification(),
    resolution: emptyResolution(),
    messages: [
      {
        _id: new ObjectId(),
        sender: "user",
        senderName: fullName,
        content: description,
      }
    ]
  };
}
createdAt: now,
isInternal: false,
},
],
assignedTo: null,
createdAt: now,
updatedAt: now,
};
const r = await db
.collection<SupportTicketDoc>("support_tickets")
.insertOne(doc as SupportTicketDoc);

await logActivity(db, {
actorId: null,
actorRole: "system",
action: "support.guest_ticket_created",
targetType: "ticket",
targetId: r.insertedId,
metadata: {ticketNumber, requesterEmail: email, ip: clientIp(req)},
});

sendTicketReceivedEmail(email, {ticketNumber, subject}).catch(() => undefined);

return res
.status(201)
.json({success: true, data: {ticketNumber, ticketId: r.insertedId.toString()}});
}