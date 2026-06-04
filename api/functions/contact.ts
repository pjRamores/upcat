import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDB } from "../src/db.js";
import { sendContactNotification } from "../src/email.js";
import { extractToken } from "../src/auth.js";
import { CONTACT_LIMITS, CONTACT_SUBJECTS, type ContactSubject, validateEmail } from "@upcat/shared";

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
        return res.status(405).json({ success: false, error: "Method not allowed" });
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

    // ── Validation ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
await sendContactNotification({name, email, subject, message, ip});
} catch (err) {
    // Don't fail the request if email delivery fails.
    console.error("[contact].notification.email.failed:", err);
}

return res.status(200).json({
    success: true,
    data: {message: "Your message has been sent! We'll get back to you soon."},
});
}