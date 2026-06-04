/**
 * POST /api/admin/push/broadcast
 *
 * Sends an announcement-type push to every subscription whose 'preferences.announcement' is true.
 * Optionally filtered by role.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ObjectId } from "mongodb";
import { requireAdmin } from "../../../../../src/auth.js";
import {getDb} from "../../../../src/db.js";
import {sendPushTo} from "../../../../src/push.js";
import type {PushBroadcastPayload, PushBroadcastResponse,} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const body = (req.body ?? {}) as Partial<PushBroadcastPayload>;
    if (!body.title || typeof body.title !== "string") {
        return res.status(400).json({success: false, error: "title is required"});
    }
    if (!body.body || typeof body.body !== "string") {
        return res.status(400).json({success: false, error: "body is required"});
    }
    const title = body.title.slice(0, 120);
    const message = body.body.slice(0, 500);
    const url = typeof body.url === "string" ? body.url.slice(0, 200) : "/dashboard";
    const type = body.type ?? "announcement";

    const db = await getDb();

    let userFilter: Record<string, unknown> = {};
    if (body.role === "admin" || body.role === "reviewee") {
        const users = (await db
            .collection("users")
            .find({role: body.role, isActive: {$ne: false}})
            .project({_id: 1})
            .toArray() as Array<{_id: ObjectId}>);
        userFilter = {userId: {$in: users.map(u => u._id)}};
    }

    const subs = (await db
        .collection("push_subscriptions")
        .find({...userFilter, [preferences.$type]: true})
        .project({endpoint: 1, keys: 1})
        .toArray() as unknown as Array<{
            _id: ObjectId;
            endpoint: string;
            keys: {p256dh: string; auth: string};
        }>);

    const results = await Promise.all(
        subs.map((s) => sendPushTo(db, s, {
            title,
            body: message,
            type,
            url,
        })),
    );

    const data: PushBroadcastResponse = {
        attempted: results.length,
        delivered: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok && !r.pruned).length,
        pruned: results.filter((r) => r.pruned).length,
    };
    return res.status(200).json({success: true, data});
}