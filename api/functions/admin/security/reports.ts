/**
 * Admin - Attack summary report.
 * GET/api/admin/security/reports/attack-summary?period=24h|7d|30d
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {withSecurity} from "../../src/security/middleware.js";

const PERIODS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export default withSecurity({endpoint: "GET/api/admin/security/reports"}) (async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({success: false, error: "Method not allowed"});
    return;
  }
  const period = (req.query.period as string) || "24h";
  const windowMs = PERIODS[period] ?? PERIODS["24h"]!;
  const since = new Date(Date.now() - windowMs);
  const db = await getDb();

  const [byType, bySeverity, topCountries, topIps, blocksTotal, eventsTotal] = await Promise.all([
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
      {$match: {timestamp: {$gte: since}, "source.country": {$ne: null}}},
      {$group: {_id: "$source.country", count: {$sum: 1}}},
      {$sort: {count: -1}},
      {$limit: 10},
    ])
    .toArray(),
    db
    .collection("security_events")
    .aggregate([
      {$match: {timestamp: {$gte: since}}},
      {$group: {_id: "$source.ip", count: {$sum: 1}}},
      {$sort: {count: -1}},
      {$limit: 20},
    ])
    .toArray(),
    db
    .collection("blocked_entities")
    .countDocuments({blockedAt: {$gte: since}, isActive: true})
    .db.collection("security_events").countDocuments({timestamp: {$gte: since}}),
  ]);

  const recommendations: string[] = [];
  const critical = bySeverity.find((b) => b._id === "critical")?.count ?? 0;
  if (critical > 50) recommendations.push("Critical event count is elevated -- review recent activity and consider lockdown if attacks persist.");
  if (topIps[0].count && topIps[0].count > 200) {
    recommendations.push(`IP ${topIps[0].id} generated ${topIps[0].count} events -- consider hard-blocking.`);
  }
  if (blocksTotal === 0 && eventsTotal > 0) {
    recommendations.push("No new blocks created despite event activity -- auto-block thresholds may be too lenient.");
  }

  res.status(200).json({
    success: true,
    data: {
      period,
      since,
      totalEvents: eventsTotal,
      newBlocks: blocksTotal,
      byType,
      bySeverity,
      topCountries,
      topIps,
      recommendations,
    },
  });
});