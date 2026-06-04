/**
 * GET /api/account/email-preferences -- returns the current user's email marketing preferences.
 * PATCH /api/account/email-preferences -- updates the current user's email marketing preferences.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../src/auth.js";
import { getDb } from "../src/db.js";
import { logActivity } from "../src/activityLog.js";

const DEFAULT_PREFERENCES = { marketing: true };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET" && req.method !== "PATCH") {
        res.setHeader("Allow", "GET, PATCH");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const db = await getDb();
    const users = db.collection("users");

    if (req.method === "PATCH") {
        const { marketing } = (req.body ?? {}) as { marketing?: unknown };
        if (typeof marketing !== "boolean") {
            return res.status(400).json({ success: false, error: "marketing must be a boolean" });
        }
        await users.updateOne(
            { _id: user._id },
            { $set: { "emailPreferences.marketing": marketing } },
        );

        await logActivity(db, {
            actorId: user._id,
            actorRole: "reviewee",
            action: "email_preferences_updated",
            targetType: "email_preferences",
            targetId: user.id,
            metadata: { marketing },
        });
    }

    const fresh = await users.findOne({ _id: user._id }, { projection: { emailPreferences: 1 } });
    const prefs = {
        ...DEFAULT_PREFERENCES,
        ...(fresh?.emailPreferences ?? {}),
    };

    return res.status(200).json({ success: true, data: { emailPreferences: prefs } });
}