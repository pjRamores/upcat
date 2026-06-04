import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { logActivity } from "../../../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "DELETE") {
        res.setHeader("Allow", "DELETE");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = String(req.query.id ?? "").trim();
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: "Invalid session id" });
    }

    const db = await getDb();
    const sessionId = new ObjectId(id);
    const result = await db.collection("practice_sessions").deleteOne({ _id: sessionId });
    if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, error: "Session not found" });
    }

    await logActivity(db, {
        actorId: admin._id,
        actorRole: "admin",
        action: "admin.practice_session.deleted",
        targetType: "practice_session",
        targetId: sessionId,
    });

    return res.status(200).json({ success: true, data: { deleted: true } });
}