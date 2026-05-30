/**
 * Cron: daily security report.
 * Schedule: 0 0 * * * (UTC midnight)
 *
 * Produces a 24h summary of security activity and persists it to
 * security reports for the admin console audit trail. Also logs a
 * synthetic event so admins can see the report ran.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {getDb} from "../../src/db.js";
import {requireCronAuth} from "../../src/cronAuth.js";
import {logSecurityEvent} from "../../src/security_events.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;
  const db = await getDb();
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [byType, bySeverity, topIps, newBlocks, totalEvents] = await Promise.all([
    db
    .collection("security_events")
    .aggregate([
      {$match: {timestamp: {$gte: since}}},
      {$group: {_id: "$type", count: {$sum: 1}}},
      {$sort: {count: -1}},
    ])
    .toArray(),
    db
    .collection("security_events")
    .aggregate([
      {$match: {timestamp: {$gte: since}}},
      {$group: {_id: "$severity", count: {$sum: 1}}},
      {$sort: {count: -1}},
      {$limit: 20},
    ])
    .toArray(),
    db
    .collection("blocked_entities")
    .countDocuments({blockedAt: {$gte: since}}),
    db.collection("security_events").countDocuments({timestamp: {$gte: since}}),
  ]);

  const report = {
    _id: new ObjectId(),
    generatedAt: now,
    periodStart: since,
    periodEnd: now,
    totalEvents,
    newBlocks,
    byType,
    bySeverity,
    topIps,
  };
  await db.collection("security_reports").insertOne(report as never);

  await logSecurityEvent({
    type: "admin.config_changed",
    severity: "low",
    source: {ip: "cron"},
    details: {kind: "daily_security_report", totalEvents, newBlocks},
    action: {taken: "report_generated", automated: true},
  });

  res.status(200).json({success: true, data: {reportId: report._id, totalEvents, newBlocks}});
}