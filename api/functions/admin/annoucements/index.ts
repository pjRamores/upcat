/**
 * Announcements -- admin CRUD + public list.
 * GET    /api/admin/announcements          → all
 * POST   /api/admin/announcements          → create
 * PUT    /api/admin/announcements/:id      → update
 * DELETE /api/admin/announcements/:id      → delete
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../../../../src/auth.js";
import {getDb} from "../../../../../../src/db.js";
import {logActivity} from "../../../../../../src/activityLog.js";
import {ANNOUNCEMENT_TYPES} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const db = await getDb();
    const col = db.collection("announcements");
    const id = req.query.id as string | undefined;

    if (req.method === "GET") {
        const items = await col.find({}).sort({createdAt: -1}).toArray();
        return res.status(200).json({
            success: true,
            data: items.map((a) => ({...a, _id: a._id.toString()})),
        });
    }

    if (req.method === "POST") {
        const v = parseAnnouncementBody(req.body ?? {});
        if (!v.ok) return res.status(400).json({success: false, error: v.error});
        const now = new Date();
        const result = await col.insertOne({...v.value, createdAt: now, createdBy: admin._id});
        await logActivity(db, {
            actorId: admin._id,
            actorRole: "admin",
            action: "admin.announcement_created",
            targetType: "announcement",
            targetId: result.insertedId,
            metadata: {title: v.value.title},
        });
        return res.status(201).json({
            success: true,
            data: {_id: result.insertedId.toString(), ...v.value, createdAt: now},
        });
    }

    if (!id || !ObjectId.isValid(id)) {
        res.setHeader("Allow", "GET,POST,PUT,DELETE");
        return res.status(400).json({success: false, error: "Valid id required for PUT/DELETE"});
    }
    const oid = new ObjectId(id);

    if (req.method === "PUT") {
        const v = parseAnnouncementBody(req.body ?? {});
        if (!v.ok) return res.status(400).json({success: false, error: v.error});
        const result = await col.updateOne({_id: oid}, {$set: {...v.value, updatedAt: new Date()}});
        if (result.matchedCount === 0) {
            return res.status(404).json({success: false, error: "Not found"});
        }
        await logActivity(db, {
            actorId: admin._id,
            actorRole: "admin",
            action: "admin.announcement_updated",
            targetType: "announcement",
            targetId: oid,
        });
        return res.status(200).json({success: true, data: {updated: true}});
    }

    if (req.method === "DELETE") {
        const result = await col.deleteOne({_id: oid});
        if (result.deletedCount === 0) {
            return res.status(404).json({success: false, error: "Not found"});
        }
        await logActivity(db, {
            actorId: admin._id,
            actorRole: "admin",
            action: "admin.announcement_deleted",
            targetType: "announcement",
            targetId: oid,
        });
        return res.status(200).json({success: true, data: {deleted: true}});
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).json({success: false, error: "Method not allowed"});
}

function parseAnnouncementBody(body: Record<string, unknown>): {
    ok: boolean;
    value: {
        title: string;
        message: string;
        type: string;
        isActive: boolean;
        startsAt: Date | null;
        expiresAt: Date | null
    }
} | {ok: false; error: string} {
    const title = String(body.title ?? "").trim();
const message = String(body.message ?? "").trim();
const type = String(body.type ?? "info");
if (!title || !message) return {ok: false, error: "title and message are required"};
if (!ANNOUNCEMENT_TYPES.includes(type as (typeof ANNOUNCEMENT_TYPES)[number])) {
    return {ok: false, error: `type must be one of ${ANNOUNCEMENT_TYPES.join(", ")}`};
}
const isActive = body.isActive !== false;
const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
if (startsAt && Number.isNaN(startsAt.getTime())) return {ok: false, error: "Invalid startsAt"};
if (expiresAt && Number.isNaN(expiresAt.getTime())) return {ok: false, error: "Invalid expiresAt"};
return {ok: true, value: {title, message, type, isActive, startsAt, expiresAt}};
}