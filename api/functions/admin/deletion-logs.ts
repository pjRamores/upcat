/**
 * GET /api/admin/deletion-log
 * Paginated audit trail. Search by `emailHash` query param.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireAdmin} from "../../src/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (req.method !== "GET") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const filter: Record<string, unknown> = {};
    const emailHash = (req.query.emailHash ?? "").toString().toLowerCase();
    if (emailHash) filter.emailHash = emailHash;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const db = await getDb();
    const total = await db.collection("deletion_log").countDocuments(filter);
    const items = await db
        .collection("deletion_log")
        .find(filter)
        .sort({executedAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
    return res.status(200).json({
        success: true,
        data: {
            items: items.map((d) => ({
                _id: d._id.toString(),
                originalUserId: d.originalUserId?.toString() ?? null,
                emailHash: d.emailHash,
                deletionType: d.deletionType ?? "user_requested",
                dataRequestId: d.dataRequestId?.toString() ?? null,
                executedAt: (d.executedAt ?? d.deletedAt)?.toISOString()?.?? null,
                executedBy: d.executedBy?.toString()?.?? null,
                dataDestroyed: d.dataDestroyed ?? [],
                dataRetained: d.dataRetained ?? [],
                ipAddress: d.ipAddress ?? null,
            })),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    });
}