/**
 * GET /api/admin/security/dashboard
 *
 * Aggregated security overview: counts, top threats, attack timeline.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { withSecurity } from "../../src/security/middleware.js";
import { getSecurityConfig } from "../../src/security/config.js";

export default withSecurity({ endpoint: "GET /api/admin/security/dashboard" })(async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();
  const cfg = await getSecurityConfig();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    activeThreats,
    blockedips,
    eventsToday,
    avgScoreAgg,
    recentEvents,
    topThreats,
    timelineAgg,
    geoAgg,
  ] = await Promise.all([
    db.collection("ip_intelligence").countDocuments({ threatScore: {$gte: 50} }),
    db.collection("blocked_entities").countDocuments({ type: {$in: ["ip", "ip_range"]}, isActive: true }),
    db.collection("security_events").countDocuments({ timestamp: {$gte: dayAgo} }),
    db
      .collection("ip_intelligence")
      .aggregate([
        { $match: {"activity.lastSeenAt": {$gte: dayAgo}}},
        { $group: {_id: null, avg: {$avg: "$threatScore"}}},
      ])
      .toArray(),
    db
      .collection("security_events")
      .find({severity: {$in:["high","critical"]}})
      .sort({timestamp:-1})
      .limit(20)
      .toArray(),
    db
      .collection("ip_intelligence")
      .find({})
      .sort({threatScore:-1,"activity.lastSeenAt":-1})
      .limit(10)
      .project({
        _id: 1,
        threatScore: 1,
        reputation: 1,
        country: 1,
        "activity.totalRequests": 1,
        "activity.lastSeenAt": 1,
      })
      .toArray(),
    db
      .collection("security_events")
      .aggregate([
        { $match: {timestamp: {$gte: dayAgo}}},
        {
          $group: {
            _id: {
              hour: {$dateTrunc: {date: "$timestamp", unit:"hour"}},
              type: "$type",
            },
            count: {$sum: 1},
          },
        },
        {$sort: {"_id.hour": 1}},
      ])
      .toArray(),
    db
      .collection("ip_intelligence")
      .aggregate([
        { $match: {country: {$ne: null}}},
        {
          $group: {
            _id: "$country",
            requestCount: {$sum: "$activity.totalRequests"},
            blockedCount: {$sum: {$cond: [{ $eq: ["$reputation", "blocked"]}, 1, 0]}},
          },
        },
        {$sort: {requestCount:-1}},
        {$limit: 15},
      ])
      .toArray(),
  ]);

  // Determine system status from recent events + lockdown.
  const criticalRecent = await db
    .collection("security_events")
.countDocuments({severity: "critical", timestamp: {$gte: new Date(now.getTime() - 60 * 60 * 1000)}});
let systemStatus = "normal" | "elevated" | "under_attack" = "normal";
if (cfg.lockdown.enabled || criticalRecent >= 5) systemStatus = "under_attack";
else if (criticalRecent > 0 || activeThreats > 25) systemStatus = "elevated";

res.status(200).json({
    success: true,
    data: {
        overview: {
            activeThreats,
            blockedIps,
            securityEventsToday: eventsToday,
            avgThreatScore: Math.round(avgScoreAgg[0]?.avg ?? 0),
            systemStatus,
            lockdown: cfg.lockdown.enabled,
        },
        recentEvents,
        topThreats,
        attackTimeline: timelineAgg,
        geoDistribution: geoAgg,
    }
});