import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const ids = (req.body?.ids ?? []) as unknown[];
    const oids = ids
        .map((id) => String(id))
        .filter(ObjectId.isValid)
        .map((id) => new ObjectId(id));
    if (oids.length === 0) {
        return res.status(400).json({success: false, error: "ids[] is required"});
    }

    const db = await getDb();
    const now = new Date();
    const result = await db.collection("questions").updateMany(
        {_id: {$in: oids}, isDeleted: {$ne: true}},
        {$set: {isDeleted: true, deletedAt: now, deletedBy: admin._id, updatedAt: now}},
    );

    await logActivity(db, {
        actorId: admin._id,
        actorRole: "admin",
        action: "question.bulk_deleted",
        targetType: "question",
        targetId: null,
        metadata: {count: result.modifiedCount, ids: oids.map((o) => o.toString())},
    });

    return res.status(200).json({
        success: true,
        data: {deleted: result.modifiedCount, requested: oids.length},
    });
}