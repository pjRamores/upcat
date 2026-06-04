import { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../src/db.js";
import {sendContactNotification} from "../src/email.js";
import {extractToken} from "../src/auth.js";
import {CONTACT_LIMITS, CONTACT_SUBJECTS, type ContactSubject, validateEmail,} from "@upcat/shared";

function getClientIp(req: VercelRequest): string {
    const fwd = req.headers["x-forwarded-for"];
    if (typeof fwd === "string" && fwd.length > 0) {
        return fwd.split(",")[0]!.trim();
    }
    if (Array.isArray(fwd) && fwd.length > 0) {
        return fwd[0]!.split(",")[0]!.trim();
    }
    return req.socket?.remoteAddress ?? "unknown";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    const body = (req.body ?? {}) as {
        name?: unknown;
        email?: unknown;
        subject?: unknown;
        message?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    // ─── Validation
    if (!name || !email || !subject || !message) {
        return res.status(400).json({success: false, error: "All fields are required."});
    }

    if (name.length > CONTACT_LIMITS.nameMax) {
        return res.status(400).json({success: false, error: "Name is too long."});
    }

    if (email.length > CONTACT_LIMITS.emailMax || !validateEmail(email)) {
        return res.status(400).json({success: false, error: "Please provide a valid email address."});
    }

    if (!CONTACT_SUBJECTS.includes(subject)) {
        return res.status(400).json({success: false, error: "Invalid subject."});
    }

    if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
        return res.status(400).json({
            success: false,
            error: `Message must be between ${CONTACT_LIMITS.messageMin} and ${CONTACT_LIMITS.messageMax} characters.`,
        });
    }

    const ip = getClientIp(req);
    const auth = extractToken(req);
    const db = await getDb();
    const collection = db.collection("contact_messages");

    // ─── Rate limiting: max N per hour per (userId or IP+email)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const rateFilter = auth
        ? {userId: auth.userId, createdAt: {$gte: oneHourAgo}}
        : {$and: [{ip}, {email}, {createdAt: {$gte: oneHourAgo}}]};

    const recentCount = await collection.countDocuments(rateFilter as object);
    if (recentCount >= CONTACT_LIMITS.maxPerHour) {
        return res.status(429).json({
            success: false,
            error: "You've sent several messages recently. Please try again in an hour.",
        });
    }

    // ─── Persist
    const now = new Date();
    await collection.insertOne({
        name,
        email,
        subject: subject as ContactSubject,
        message,
        ip,
        userAgent: req.headers["user-agent"] ?? null,
        userId: auth?.userId ?? null,
        status: "new",
        createdAt: now,
    });

    // ─── Notify developer (best-effort)
    try {
await sendContactNotification({name, email, subject, message, ip});
} catch (err) {
    // Don't fail the request if email delivery fails.
    console.error("[contact] notification email failed:", err);
}

return res.status(200).json({
    success: true,
    data: {message: "Your message has been sent! We'll get back to you soon."},
});