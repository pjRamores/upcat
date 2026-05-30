import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {
  acknowledgeAlert,
  defaultAlertRulesSeed,
  evaluateAlertRules,
  fireAlert,
  resolveAlert,
  silenceAlert,
} from "../../src/monitoring/alerts.js";
import {saveMonitoringConfig} from "../../src/monitoring/config.js";
import {healthCheckRunner, summarizeHealth} from "../../src/monitoring/health.js";
import {metricsCollector} from "../../src/monitoring/metrics.js";
import {withSecurity} from "../../src/security/middleware.js";

type TimeRangeKey = "1h" | "6h" | "24h" | "7d";

function toDateFromRange(range: string): Date {
  const now = Date.now();
  if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000);
  if (range === "6h") return new Date(now - 6 * 60 * 60 * 1000);
  return new Date(now - 60 * 60 * 1000);
}

function queryString(input: unknown, fallback: string): string {
  if (typeof input === "string" && input.trim()) return input;
  return fallback;
}

async function getDashboard(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const range = queryString(req.query.range, "1h") as TimeRangeKey;
  const since = toDateFromRange(range);

  const [summary, checks, openAlerts, logsByLevel, reqCount, errorCount, p95] = await Promise.all([
    summarizeHealth(db),
    healthCheckRunner.getChecks(db),
    db.collection("alerts").countDocuments({status: {$in: ["firing", "acknowledged", "silenced"]}}),
    db.collection("application_logs").aggregate([
      {$match: {timestamp: {$gte: since}}},
      {$group: {_id: "$level", count: {$sum: 1}}},
    ]).toArray(),
    db.collection("metrics").countDocuments({name: "api.request.count", timestamp: {$gte: since}}),
    db.collection("metrics").countDocuments({name: "api.request.error", timestamp: {$gte: since}}),
    db.collection("metrics").find({name: "api.request.duration", timestamp: {$gte: since}, histogram: {$ne: null}})
    .project({"histogram.p95": 1})
    .sort({timestamp: -1})
    .limit(1)
    .toArray(),
  ]);

  const levelMap = (logsByLevel as Array<
    _id: string;
    count: number
  })?.reduce<Record<string, number>>((acc, row) => {
    acc[row._id || "unknown"] = row.count;
    return acc;
  }, {});

  return res.status(200).json({
    success: true,
    data: {
      range,
      overview: {
        health: summary.overall,
        checksTotal: checks.length,
        checksUnhealthy: checks.filter((check) => check.currentStatus === "unhealthy").length,
        checksDegraded: checks.filter((check) => check.currentStatus === "degraded").length,
        openAlerts,
        requests: reqCount,
        errors: errorCount,
        errorRatePercent: reqCount > 0 ? Math.round((errorCount / reqCount) * 10_000) / 100 : 0,
        p95LatencyMs: Math.round(Number((p95[0] as {histogram?: {p95?: number}}))?.histogram?.p95 ?? 0)),
      },
      logsByLevel: levelMap,
      checks,
    },
  }));
}

async function getLogs(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const level = typeof req.query.level === "string" ? req.query.level : null;
  const service = typeof req.query.service === "string" ? req.query.service : null;
  const search = typeof req.query.search === "string" ? req.query.search : null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));
  const filter: Record<string, unknown> = {};
  if (level) filter.level = level;
  if (service) filter["context.service"] = service;
  if (search) filter.$or = [{message: new RegExp(search, "i")}, {"error.message": new RegExp(search, "i")}];

  const [items, total] = await Promise.all([
    db.collection("application_logs").find(filter).sort({timestamp: -1}).skip((page - 1) * limit).limit(limit).toArray(),
    db.collection("application_logs").countDocuments(filter),
  ]);
}

return res.status(200).json({
  success: true,
  data: {
    items,
if (req.method === "GET") {
  const rules = await db.collection("alert_rules").find({}).sort({updatedAt: -1}).toArray();
  return res.status(200).json({success: true, data: rules});
}

if (req.method === "POST") {
  const body = (req.body ?? {}).asRecord<string, unknown>;
  const action = queryString(req.query.action, "create");
  if (action === "seed-defaults") {
    const docs = defaultAlertRulesSeed(adminId);
    for (const doc of docs) {
      await db.collection("alert_rules").updateOne({ruleId: doc.ruleId}, {$setOnInsert: doc}, {upsert: true});
    }
    return res.status(200).json({success: true, data: {seeded: docs.length}});
  }

  const ruleId = queryString(body.ruleId || req.query.id, `rule_${Date.now()}`);
  await db.collection("alert_rules").updateOne(
    {ruleId},
    {
      $set: {
        ...body,
        ruleId,
        ...updatedAt: new Date(),
      },
      $setOnInsert: {
        ...createdAt: new Date(),
        ...createdBy: adminId,
      },
    },
    {upsert: true},
  );
  return res.status(200).json({success: true, data: {ruleId}});
}

if (req.method === "PUT") {
  const body = (req.body ?? {}).asRecord<string, unknown>;
  const ruleId = queryString(body.ruleId || req.query.id, "");
  if (!ruleId) return res.status(400).json({success: false, error: "ruleId is required"});
  await db.collection("alert_rules").updateOne({ruleId}, {$set: {...body, updatedAt: new Date()}});
  return res.status(200).json({success: true});
}

return res.status(405).json({success: false, error: "Method not allowed"});
}

async function healthChecks(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const checks = await healthCheckRunner.getChecks();
    return res.status(200).json({success: true, data: checks});
  }

  if (req.method === "POST") {
    const action = queryString(req.query.action, "run-all");
    if (action === "run-all") {
      const result = await healthCheckRunner.runAll();
      return res.status(200).json({success: true, data: result});
    }
    const checkId = queryString(req.query.checkId, "");
    if (!checkId) return res.status(400).json({success: false, error: "checkId is required"});
    const result = await healthCheckRunner.runCheck(checkId);
    return res.status(200).json({success: true, data: result});
  }

  if (req.method === "PUT") {
    const body = (req.body ?? {}).asRecord<string, unknown>;
    const checkId = queryString(body.checkId || req.query.checkId, "");
    if (!checkId) return res.status(400).json({success: false, error: "checkId is required"});
    await healthCheckRunner.updateCheckConfig(checkId, (body.config ?? {}).asNever);
    return res.status(200).json({success: true});
  }

  return res.status(405).json({success: false, error: "Method not allowed"});
}

async function configResource(req: VercelRequest, res: VercelResponse, adminId: ObjectId) {
  const db = await getDb();
  if (req.method === "GET") {
    const config = await db.collection<
      _id: string
    > & Record<string, unknown>>("monitoring_config").findOne({_id: "global"});
    return res.status(200).json({success: true, data: config});
  }

  if (req.method === "PUT") {
    const patch = (req.body ?? {}).asRecord<string, unknown>;
    const saved = await saveMonitoringConfig(patch as never, adminId, db);
    return res.status(200).json({success: true, data: saved});
  }

  return res.status(405).json({success: false, error: "Method not allowed"});
}

async function reports(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const action = queryString(req.query.action, "summary");
  if (action === "evaluate-rules") {
    const result = await evaluateAlertRules(db);
    await metricsCollector.flush(db);
    return res.status(200).json({success: true, data: result});
  }

  const since = toDateFromRange(queryString(req.query.range, "24h"));
  const [alerts, logs, checks] = await Promise.all([
db.collection("alerts").find({firedAt: {$gte: since}}).sort({firedAt: -1}).limit(500).toArray(),
db.collection("application_logs").find({
timestamp: {$gte: since},
level: {$in: ["error", "fatal"]}
}).sort({timestamp: -1}).limit(500).toArray(),
healthCheckRunner.getChecks(db),
});
return res.status(200).json({
success: true,
data: {
generatedAt: new Date().toISOString(),
alerts,
logs,
checks,
},
});
}

export default withSecurity({endpoint: "GET/api/admin/monitoring"})(async (req, res) => {
const admin = await requireAdmin(req, res);
if (!admin) return;

const resource = queryString(req.query.resource, "dashboard");

if (resource === "dashboard" && req.method === "GET") {
await getDashboard(req, res);
return;
}

if (resource === "logs" && req.method === "GET") {
await getLogs(req, res);
return;
}

if (resource === "metrics" && req.method === "GET") {
await getMetrics(req, res);
return;
}

if (resource === "alerts") {
if (req.method === "GET") {
await getAlerts(req, res);
return;
}

if (req.method === "PUT") {
await mutateAlert(req, res, admin._id);
return;
}

if (req.method === "POST") {
await testAlert(res);
return;
}

if (resource === "alert-rules") {
await alertRules(req, res, admin._id);
return;
}

if (resource === "health-checks") {
await healthChecks(req, res);
return;
}

if (resource === "config") {
await configResource(req, res, admin._id);
return;
}

if (resource === "reports" && req.method === "GET") {
await reports(req, res);
return;
}

res.status(404).json({success: false, error: "Resource not found"});
});