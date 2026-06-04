/**
 * Admin - Blocked entities CRUD.
 * GET    /api/admin/security/blocked          (list all rules)
 * POST   /api/admin/security/blocked           (add rule)
 * DELETE /api/admin/security/blocked/:id       (deactivate)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../../../src/auth.js";
import { getDb } from "../../../../src/db.js";
import { withSecurity } from "../../../../src/security/middleware.js";
import { invalidateBlockedCache } from "../../../../src/security/blockedEntities.js";
import { logSecurityEvent } from "../../../../src/security/events.js";

const VALID_TYPES = new Set([
    "ip",
    "ip_range",
    "fingerprint",
    "email_domain",
    "user_agent_pattern",
]);

export default withSecurity({ endpoint: "ADMIN /api/admin/security/blocked" })(async (
    req: VercelRequest,
    res: VercelResponse,
) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const db = await getDb();
    const url = req.url || "";
    const delMatch = url.match(/\/blocked\/([a-f0-9]{24})/i);

    if (delMatch && req.method === "DELETE") {
        const id = new ObjectId(delMatch[1]!);
        const r = await db
            .collection("blocked_entities")
            .updateOne({ _id: id }, { $set: { isActive: false } });
        if (!r.matchedCount) {
            res.status(404).json({ success: false, error: "Block not found" });
            return;
        }
        invalidateBlockedCache();
        await logSecurityEvent({
            type: "admin.manual_block_removed",
            severity: "medium",
            source: { ip: "admin", userId: admin._id.toString() },
            details: { blockId: id.toHexString() },
            action: { taken: "deactivate", automated: false },
        });
        res.status(200).json({ success: true });
        return;
    }

    if (req.method === "POST") {
        const body = (req.body ?? {}).as<{
            type?: string;
            value?: string;
            severity?: "hard" | "soft";
            reason?: string;
            expiresAt?: string | null;
        }>;
        if (body.type || !VALID_TYPES.has(body.type) || !body.value) {
            res.status(400).json({ success: false, error: "Invalid type or value" });
            return;
        }
        if (body.type === "user_agent_pattern") {
            try {
                new RegExp(body.value);
            } catch {
                res.status(400).json({ success: false, error: "Invalid regex" });
                return;
            }
        }
        const doc = {
            id: new ObjectId(),
            type: body.type,
            value: body.value.slice(0, 500),
            severity: body.severity ?? "hard",
            reason: (body.reason || "Admin block").slice(0, 500),
            blockedBy: admin._id,
            blockedAt: new Date(),
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            isActive: true,
            metadata: { hitCount: 0, lastHitAt: null, associatedEvents: [] },
        };
        await db.collection("blocked_entities").insertOne(doc as never);
        invalidateBlockedCache();
        await logSecurityEvent({
            type: "admin.manual_block_added",
            severity: "high",
            source: { ip: "admin", userId: admin._id.toString() },
            details: { type: body.type, value: body.value },
            action: { taken: "block", automated: false },
        });
        res.status(201).json({ success: true, data: { id: doc._id } });
        return;
    }

    if (req.method !== "GET") {
        res.setHeader("Allow", "GET, POST, DELETE");
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
});
const q = req.query as Record<string, string | undefined>;
const filter: Record<string, unknown> = {};
if (q.type) filter.type = q.type;
if (q.active === "true") filter.isActive = true;
if (q.active === "false") filter.isActive = false;

const items = await db
    .collection("blocked_entities")
    .find(filter)
    .sort({blockedAt: -1})
    .limit(500)
    .toArray();
res.status(200).json({success: true, data: {items, total: items.length}});
});