/**
 * Admin.security.event.endpoints (list + detail + review).
 *
 * Single-file dispatching by URL path to keep handler count tight:
 * GET .../api/admin/security/events
 * GET .../api/admin/security/events/:id
 * PUT .../api/admin/security/events/:id/review
 */

import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {withSecurity} from "../../src/security/middleware.js";
import {invalidateBlockedCache} from "../../src/security/blockedEntities.js";
import {adjustThreatScore} from "../../src/security/ipIntel.js";

export default withSecurity({endpoint: "GET /api/admin/security/events"})(async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const url = req.url || "";
  const reviewMatch = url.match(/\/events\/([a-f0-9]{24})\/review/i);
  const detailMatch = url.match(/\/events\/([a-f0-9]{24})(?:[?$])/i) ?? url.match(/\/events\/([a-f0-9]{24})$/i);

  const db = await getDb();

  if (reviewMatch && req.method === "PUT") {
    const id = new ObjectId(reviewMatch[1]);
    const body = (req.body ?? {}).as({
      notes?: string;
      action?: "dismiss" | "block_ip" | "block_user" | "escalate";
    });
    const ev = await db.collection("security_events").findOne({_id: id});
    if (!ev) {
      res.status(404).json({success: false, error: "Event not found"});
      return;
    }
    await db.collection("security_events").updateOne({
      _id: id,
    },
    {
      $set: {
        reviewed: true,
        reviewedBy: admin._id,
        reviewedAt: new Date(),
        notes: typeof body.notes === "string" ? body.notes.slice(0, 1000) : null,
      }
    },
    if (body.action === "block_ip" && ev.source?.ip) {
      await db.collection("blocked_entities").insertOne({
        _id: new ObjectId(),
        type: "ip",
        value: ev.source.ip,
        severity: "hard",
        reason: `From event ${id.toHexString()}: ${ev.type}`,
        blockedBy: admin._id,
        blockedAt: new Date(),
        expiresAt: null,
        isActive: true,
        metadata: {hitCount: 0, lastHitAt: null, associatedEvents: [id]},
      } as never);
      invalidateBlockedCache();
      await adjustThreatScore(ev.source.ip, {delta: 50, reason: "admin_block"});
    }
    if (body.action === "block_user" && ev.source?.userId) {
      await db.collection("users")
        .updateOne({_id: ev.source.userId}, {$set: {isActive: false}});
    }
    res.status(200).json({success: true, data: {reviewed: true}});
    return;
  }

  if (detailMatch && req.method === "GET") {
    const id = new ObjectId(detailMatch[1]);
    const ev = await db.collection("security_events").findOne({_id: id});
    if (!ev) {
      res.status(404).json({success: false, error: "Event not found"});
      return;
    }
    const hourMs = 60 * 60 * 1000;
    const related = await db
      .collection("security_events")
      .find({
        _id: {$ne: id},
        "source.ip": ev.source?.ip,
        timestamp: {
          $ge: new Date(ev.timestamp.getTime() - hourMs),
          $lt: new Date(ev.timestamp.getTime() + hourMs),
        },
      })
      .sort({timestamp: -1})
      .limit(30)
      .toArray();
    const ipIntel = ev.source?.ip
      ? await db.collection("ip_intelligence").findOne({_id: ev.source.ip} as never)
      : null;
    res.status(200).json({success: true, data: {event: ev, related, ipIntel}});
    return;
  }
}
if (req.method !== "GET") {
  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({success: false, error: "Method not allowed"});
  return;
}

// List with filters.
const q = req.query as Record<string, string> | undefined;
const filter: Record<string, unknown> = {};
if (q.type) filter.type = q.type;
if (q.severity) filter.severity = q.severity;
if (q.ip) filter["source.ip"] = q.ip;
if (q.userId && ObjectId.isValid(q.userId)) filter["source.userId"] = new ObjectId(q.userId);
if (q.reviewed === "true") filter.reviewed = true;
if (q.reviewed === "false") filter.reviewed = false;
if (q.from) {
  const d = new Date(q.from);
  if (!Number.isNaN(d.getTime())) {
    filter as Record<string, Record<string, Date>>).timestamp ??= {};
    filter as Record<string, Record<string, Date>>).timestamp!.$gte = d;
  }
}
if (q.to) {
  const d = new Date(q.to);
  if (!Number.isNaN(d.getTime())) {
    filter as Record<string, Record<string, Date>>).timestamp ??= {};
    filter as Record<string, Record<string, Date>>).timestamp!.$lte = d;
  }
}

const page = Math.max(1, Number(q.page) || 1);
const limit = Math.min(100, Math.max(1, Number(q.limit) || 50));
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  db
  .collection("security_events")
  .find(filter)
  .sort({timestamp: -1})
  .skip(skip)
  .limit(limit)
  .toArray(),
  db.collection("security_events").countDocuments(filter),
]);

res.status(200).json({
  success: true,
  data: {items, total, page, limit, totalPages: Math.ceil(total / limit)},
});