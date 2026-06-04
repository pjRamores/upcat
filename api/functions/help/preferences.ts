import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../..../src/auth.js";
import { getDb } from "../../../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "PUT") {
        res.setHeader("Allow", "PUT");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const body = (req.body ?? {}) as {
        showToolTips?: unknown;
        showOnboarding?: unknown;
        reducedHelp?: unknown;
        resetDismissed?: unknown;
    };

    const set: Record<string, unknown> = {};
    if (typeof body.showToolTips === "boolean") set["help.helpPreferences.showToolTips"] = body.showToolTips;
    if (typeof body.showOnboarding === "boolean") set["help.helpPreferences.showOnboarding"] = body.showOnboarding;
    if (typeof body.reducedHelp === "boolean") set["help.helpPreferences.reducedHelp"] = body.reducedHelp;
    if (Object.keys(set).length === 0 && body.resetDismissed !== true) {
        return res.status(400).json({ success: false, error: "No preference fields provided" });
    }

    const db = await getDb();
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length > 0) update.$set = set;
    if (body.resetDismissed === true) update.$set = {
        ... (update.$set as Record<string, unknown> | undefined),
        "help.dismissedHelp": []
    };

    await db.collection("users").updateOne({ _id: user._id }, update);

    return res.status(200).json({ success: true, data: { updated: true } });
}