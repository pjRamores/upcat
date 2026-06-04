/**
 * Admin -- IP intelligence endpoints.
 * GET /api/admin/security/ips (list with filters)
 * GET /api/admin/security/ips/:ip (detail)
 * POST /api/admin/security/ips/ip/block (hard block)
 * POST /api/admin/security/ips/:ip/unblock
 * POST /api/admin/security/ips/block-range (CIDR)
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../../../src/db.js";
import { withSecurity } from "../../../../src/security/middleware.js";
import { invalidateBlockedCache } from "../../../../src/security/blockedEntities.js";
import { adjustThreatScore } from "../../../../src/security/ipIntel.js";
import { logSecurityEvent } from "../../../../src/security/events.js";

export default withSecurity({ endpoint: "ADMIN /api/admin/security/ips" })(async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const url = req.url || "";
  const db = await getDb();

  // POST /ips/block-range
  if (req.method === "POST" && url.includes("/block-range")) {
    const body = (req.body ?? {}) as {
      cidr?: string;
      severity?: "hard" | "soft";
      reason?: string;
      duration?: number;
    };
    if (!body.cidr || !/^\d{1,3}(\.\d{1,3}){3}\d{1,2}$|^[0-9a-f:]+\/\d{1,3}$/i.test(body.cidr)) {
      res.status(400).json({ success: false, error: "Invalid CIDR" });
      return;
    }
    const expiresAt = body.duration ? new Date(Date.now() + body.duration * 1000) : null;
    const doc = {
      _id: new ObjectId(),
      type: "ip_range",
      value: body.cidr,
      severity: body.severity ?? "hard",
      reason: body.reason || "Admin block",
      blockedBy: admin._id,
      blockedAt: new Date(),
      expiresAt,
      isActive: true,
      metadata: { hitCount: 0, lastHitAt: null, associatedEvents: [] },
    };
    await db.collection("blocked_entities").insertOne(doc as never);
    invalidateBlockedCache();
    await logSecurityEvent({
      type: "admin.manual_block_added",
      severity: "high",
      source: { ip: "admin", userId: admin._id.toString() },
      details: { cidr: body.cidr, reason: body.reason },
      action: { taken: "block_ip_range", automated: false },
    });
    res.status(200).json({ success: true, data: { id: doc._id, cidr: body.cidr } });
    return;
  }

  // Match /ips/:ip[/block|/unblock]
  const ipMatch = url.match(/\/ips\/([^/?]+)(?:\/(block|unblock))?$/);
  const ip = ipMatch ? decodeURIComponent(ipMatch[1]) : null;
  const ipAction = ipMatch?.[2];

  if (ip && ipAction === "block" && req.method === "POST") {
    const body = (req.body ?? {}) as {
      severity?: "hard" | "soft";
      reason?: string;
      duration?: number;
    };
    const expiresAt = body.duration ? new Date(Date.now() + body.duration * 1000) : null;
    const doc = {
      _id: new ObjectId(),
      type: "ip",
      value: ip,
      severity: body.severity ?? "hard",
      reason: body.reason || "Admin block",
      blockedBy: admin._id,
      blockedAt: new Date(),
      expiresAt,
      isActive: true,
      metadata: { hitCount: 0, lastHitAt: null, associatedEvents: [] },
    };
    await db.collection("blocked_entities").insertOne(doc as never);
    invalidateBlockedCache();
    await adjustThreatScore(ip, { delta: -50, reason: "admin_block" });
    await logSecurityEvent({
      type: "admin.manual_block_added",
      severity: "high",
      source: { ip: "admin", userId: admin._id.toString() },
      target: { type: "ip", value: ip },
      action: { taken: "block_ip", automated: false },
    });
    res.status(200).json({ success: true, data: { id: doc._id } });
    return;
  }

  if (ip && ipAction === "unblock" && req.method === "POST") {
const r = await db
    .collection("blocked_entities")
    .updateMany({type: "ip", value: ip, isActive: true}, {$set: {isActive: false}});
invalidateBlockedCache();
await db
    .collection("ip_intelligence")
    .updateOne({_id: ip as never}, {$set: {threatScore: 50, reputation: "neutral"}});
await logSecurityEvent({
    type: "admin.manual_block_removed",
    severity: "medium",
    source: {ip: "admin", userId: admin._id.toString()},
    target: {type:"ip", value: ip},
    action: {taken: "unblock_ip", automated: false},
});
res.status(200).json({success: true, data: {removed: r.modifiedCount}});
return;

if (ip && req.method === "GET") {
    const intel = await db.collection("ip_intelligence").findone({_id: ip as never});
    if (!intel) {
        res.status(404).json({success: false, error: "IP not found"});
        return;
    }
    const [events, blocks] = await Promise.all([
        db
            .collection("security_events")
            .find({"source.ip": ip})
            .sort({timestamp: -1})
            .limit(50)
            .toArray(),
        db.collection("blocked_entities").find({type:"ip", value: ip}).toArray(),
    ]);
    res.status(200).json({success: true, data: {ip: intel, events, blocks}});
    return;
}

if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({success: false, error: "Method not allowed"});
    return;
}

// List
const q = req.query as Record<string, string | undefined>;
const filter: Record<string, unknown> = {};
if (q.reputation) filter.reputation = q.reputation;
if (q.country) filter.country = q.country;
if (q.minScore) filter.threatScore = {$gte: Number(q.minScore)};
if (q.maxScore) {
    filter.threatScore = {...(filter.threatScore as object), $lte: Number(q.maxScore)};
}

const page = Math.max(1, Number(q.page) || 1);
const limit = Math.min(100, Math.max(1, Number(q.limit) || 50));
const sortField = (q.sort as string) || "threatScore";
const [items, total] = await Promise.all([
    db
        .collection("ip_intelligence")
        .find(filter)
        .sort([{[sortField]: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    db.collection("ip_intelligence").countDocuments(filter),
]);
res.status(200).json({
    success: true,
    data: {items, total, page, limit, totalPages: Math.ceil(total / limit)},
});