import { createHmac } from "node:crypto";
import type { Db, ObjectId, WithId } from "mongodb";
import { getRawDb } from "../db.js";
import { getMonitoringConfig } from "./config.js";
import { createLogger } from "./logger.js";
import type { AlertDocument, AlertRuleDocument } from "./types.js";

const log = createLogger("scheduler");

function nowIsoMinute() {
    return new Date().toISOString().slice(0, 16);
}

async function shouldSuppressByQuietHours(
    severity: AlertDocument["severity"],
    db: Db,
): Promise<boolean> {
    const cfg = await getMonitoringConfig(db);
    const q = cfg.alerting.quietHours;
    if (!q.enabled || !q.suppressSeverities.includes(severity)) return false;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (q.startTime <= q.endTime) {
        return hhmm >= q.startTime && hhmm < q.endTime;
    }
    return hhmm >= q.startTime || hhmm < q.endTime;
}

function buildAlertId(): string {
    return `ALT-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 10_000).toString().padStart(4, "0")}`;
}

export async function notifyAlert(
    alert: WithId<AlertDocument>,
    channels: string[],
    db?: Db,
): Promise<void> {
    const targetDb = db ?? (await getRawDb());
    const cfg = await getMonitoringConfig(targetDb);
    const notifications: AlertDocument["notifications"] = [];

    for (const channel of channels) {
        try {
            if (channel === "admin_email" && cfg.alerting.channels.adminEmail.enabled) {
                for (const recipient of cfg.alerting.channels.adminEmail.recipients) {
                    notifications.push({ channel: "email", sentAt: new Date(), recipient, status: "sent" });
                }
            }
            if (channel === "admin_push" && cfg.alerting.channels.adminPush.enabled) {
                notifications.push({ channel: "push", sentAt: new Date(), recipient: "admins", status: "sent" });
            }
            if (channel === "webhook" && cfg.alerting.channels.webhook.enabled && cfg.alerting.channels.webhook.url) {
                const payload = {
                    alertId: alert.alertId,
                    severity: alert.severity,
                    title: alert.title,
                    description: alert.description,
                    status: alert.status,
                    firedAt: alert.firedAt,
                };
                const body = JSON.stringify(payload);
                const secret = cfg.alerting.channels.webhook.secret || "";
                const signature = secret ? createHmac("sha256", secret).update(body).digest("hex") : "";
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                };
                if (signature) headers["X-Alert-Signature"] = signature;
                if (cfg.alerting.channels.webhook.headers) {
                    Object.assign(headers, cfg.alerting.channels.webhook.headers);
                }

                await fetch(cfg.alerting.channels.webhook.url, {
                    method: "POST",
                    headers,
                    body,
                });
                notifications.push({
                    channel: "webhook",
                    sentAt: new Date(),
                    recipient: cfg.alerting.channels.webhook.url,
                    status: "sent",
                });
            }
        } catch {
            notifications.push({ channel, sentAt: new Date(), recipient: channel, status: "failed" });
        }
    }

    if (notifications.length) {
        await targetDb.collection<AlertDocument>("alerts").updateOne(
            {_id: alert._id},
            {$push: {notifications: {$each: notifications}}},
        );
    }
}

export async function fireAlert(
    input: Pick<AlertDocument, "source" | "severity" | "title" | "description" | "context">,
    channels: string[] = ["admin_email", "admin_push"],
    db?: Db,
): Promise<WithId<AlertDocument> | null> {
    const targetDb = db ?? (await getRawDb());
    if (await shouldSuppressByQuietHours(input.severity, targetDb)) return null;

    const alertDoc: AlertDocument = {
        alertId: buildAlertId(),
        source: input.source,
        severity: input.severity,
        title: input.title,
        description: input.description,
        status: "firing",
        firedAt: new Date(),
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
        resolvedBy: null,
        silencedUntil: null,
        context: input.context,
        notifications: [],
        resolution: null,
        occurrenceCount: 1,
        lastOccurrence: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const inserted = await targetDb.collection<AlertDocument>("alerts").insertOne(alertDoc);
    const created = { _id: inserted.insertedId, ...alertDoc };
    await notifyAlert(created, channels, targetDb);
    log.warn("Alert fired", { alertId: alertDoc.alertId, title: alertDoc.title, severity: alertDoc.severity });
    return created;
}

export async function upsertHealthAlert(
    checkId: string,
    status: "healthy" | "degraded" | "unhealthy",
    message: string,
    db?: Db,
): Promise<void> {
    const targetDb = db ?? (await getRawDb());
    const existing = await targetDb.collection<AlertDocument>("alerts").findOne({
        "source.type": "health_check",
        "source.checkId": checkId,
        status: {$in: ["firing", "acknowledged", "silenced"]},
    }) as never;

    if (status === "healthy") {
        if (existing) {
            await targetDb.collection<AlertDocument>("alerts").updateOne(
                { _id: existing._id },
                {
                    $set: {
                        status: "resolved",
                        resolvedAt: new Date(),
                        resolvedBy: "system",
                        updatedAt: new Date(),
                        resolution: {
                            type: "auto_resolved",
                            notes: "Health check recovered",
                            rootCause: null,
                        },
                    },
                }
            );
            return;
        }

        if (existing) {
            await targetDb.collection<AlertDocument>("alerts").updateOne(
                { _id: existing._id },
                {
                    $inc: { occurrenceCount: 1 },
                    $set: {
                        updatedAt: new Date(),
                        lastOccurrence: new Date(),
                        description: message,
                        context: {
                            ...existing.context,
                            currentValue: status,
                            threshold: "healthy",
                        },
                    },
                }
            );
            return;
        }

        await fireAlert(
            {
                source: {
                    type: "health_check",
                    checkId,
                    metricName: null,
                    ruleId: null,
                },
                severity: status === "unhealthy" ? "critical" : "warning",
                title: `Health check ${checkId} ${status}`,
                description: message,
                context: {
                    currentValue: status,
                    threshold: "healthy",
                    duration: null,
                    affectedComponents: [checkId],
relatedLogIds: null,
relatedMetrics: null,
},
["admin_email","admin_push"],
targetDb,
};

function compare(value: number, operator: AlertRuleDocument["condition"]["operator"], threshold: number): boolean {
    if (operator === "gt") return value > threshold;
    if (operator === "gte") return value >= threshold;
    if (operator === "lt") return value < threshold;
    if (operator === "lte") return value <= threshold;
    if (operator === "eq") return value === threshold;
    return value !== threshold;
}

async function evaluateThreshold(rule: AlertRuleDocument, db: Db): Promise<{ firing: boolean; value: number | null }> {
    const condition = rule.condition;
    if (!condition.metric) return { firing: false, value: null };

    const since = new Date(Date.now() - condition.duration * 1000);
    const filters: Record<string, unknown> = {
        name: condition.metric,
        timestamp: {$gte: since},
    };
    for (const [key, value] of Object.entries(condition.dimensions ?? {})) {
        filters[`dimensions.${key}`] = value;
    }
    const points = await db.collection("metrics").find(filters).project({value: 1}).toArray();
    if (!points.length) return { firing: false, value: null };
    const avg = points.reduce((sum, item) => sum + Number(item as { value?: number }).value ?? 0), 0) / points.length;
    return { firing: compare(avg, condition.operator, condition.value), value: avg };
}

async function evaluateAbsence(rule: AlertRuleDocument, db: Db): Promise<{ firing: boolean; value: number | null }> {
    if (!rule.condition.expectedMetric || !rule.condition.maxAbsenceSeconds) return { firing: false, value: null };
    const latest = await db.collection("metrics").find({name: rule.condition.expectedMetric}).sort({timestamp: -1}).limit(1).toArray();
    if (!latest[0]) return { firing: true, value: null };
    const ts = new Date(latest[0].as?.timestamp?: string | Date).timestamp ?? 0).getTime();
    const ageSeconds = (Date.now() - ts) / 1000;
    return { firing: ageSeconds > rule.condition.maxAbsenceSeconds, value: ageSeconds };
}

async function evaluatePattern(rule: AlertRuleDocument, db: Db): Promise<{ firing: boolean; value: number | null }> {
    if (!rule.condition.logPattern || !rule.condition.windowSeconds || !rule.condition.countThreshold) {
        return { firing: false, value: null };
    }
    const since = new Date(Date.now() - rule.condition.windowSeconds * 1000);
    const regex = new RegExp(rule.condition.logPattern, "i");
    const count = await db.collection("application_logs").countDocuments({
        timestamp: {$gte: since},
        message: regex,
        ...(rule.condition.logLevel ? {level: rule.condition.logLevel} : {}),
    });
    return { firing: count >= rule.condition.countThreshold, value: count };
}

async function evaluateRateChange(rule: AlertRuleDocument, db: Db): Promise<{ firing: boolean; value: number | null }> {
    const metric = rule.condition.metric;
    const duration = rule.condition.duration;
    if (!metric || !duration || !rule.condition.changePercent) return { firing: false, value: null };

    const now = Date.now();
    const windowMs = duration * 1000;
    const currentFrom = new Date(now - windowMs);
    const prevFrom = new Date(now - windowMs * 2);
    const prevTo = new Date(now - windowMs);

    const [currentRows, prevRows] = await Promise.all([
        db.collection("metrics").find({name: metric, timestamp: {$gte: currentFrom}}).project({value: 1}).toArray(),
        db.collection("metrics").find({
            name: metric,
            timestamp: {$gte: prevFrom, $lt: prevTo}
        }).project({value: 1}).toArray(),
    ]);
    const currentAvg = currentRows.length
        ? currentRows.reduce((s, row) => s + Number(row as { value?: number }).value ?? 0), 0) / currentRows.length
        : 0;
    const prevAvg = prevRows.length
        ? prevRows.reduce((s, row) => s + Number(row as { value?: number }).value ?? 0), 0) / prevRows.length
        : 0;
    if (prevAvg <= 0) return { firing: false, value: currentAvg };
    const change = ((currentAvg - prevAvg) / prevAvg) * 100;
    return { firing: Math.abs(change) >= rule.condition.changePercent, value: change };
}

async function evaluateRule(rule: AlertRuleDocument, db: Db): Promise<{ firing: boolean; value: number | null }> {
    if (rule.condition.type === "threshold") return evaluateThreshold(rule, db);
    if (rule.condition.type === "absence") return evaluateAbsence(rule, db);
    if (rule.condition.type === "pattern") return evaluatePattern(rule, db);
    if (rule.condition.type === "rate_change") return evaluateRateChange(rule, db);
    return { firing: false, value: null };
}

function alertKey(rule: AlertRuleDocument): string {
    return `${rule.ruleId}:${nowIsoMinute()}`;
}

export async function evaluateAlertRules(db?: Db): Promise<{ evaluated: number; fired: number; resolved: number }> {
    const targetDb = db ?? (await getRawDb());
    const rules = await targetDb.collection<AlertRuleDocument>("alert_rules").find({isActive: true}).toArray();
    let fired = 0;
let resolved = 0;

for (const rule of rules) {
    const result = await evaluateRule(rule, targetDb);
    const open = await targetDb.collection<AlertDocument>("alerts").findOne({
        "source.ruleId": rule.ruleId,
        status: {$in: ["firing", "acknowledged", "silenced"]},
    } as never);

    if (result.firing) {
        const key = alertKey(rule);
        const recent = await targetDb.collection("alerts").countDocuments({
            "source.ruleId": rule.ruleId,
            firedAt: {$gte: new Date(Date.now() - rule.cooldownMinutes * 60 * 1000)},
        });
        if (!open && recent === 0) {
            const created = await fireAlert(
                {
                    source: {
                        type: "metric_threshold",
                        checkId: null,
                        metricName: rule.condition.metric,
                        ruleId: rule.ruleId,
                    },
                    severity: rule.severity,
                    title: rule.name,
                    description: `${rule.description} (key ${key})`,
                    context: {
                        currentValue: result.value,
                        threshold: rule.condition.value,
                        duration: `${rule.condition.duration}s`,
                        affectedComponents: [rule.condition.metric || rule.ruleId],
                        relatedLogIds: null,
                        relatedMetrics: null,
                    },
                },
                rule.notifyChannels,
                targetDb,
            );
            if (created.fired += 1;
        } else if (open) {
            await targetDb.collection<AlertDocument>("alerts").updateOne(
                {_id: open._id},
                {$set: {lastOccurrence: new Date(), updatedAt: new Date()}, $inc: {occurrenceCount: 1}},
            );
            continue;
        }
    }

    if (!result.firing && open && rule.autoResolve) {
        await targetDb.collection<AlertDocument>("alerts").updateOne(
            {_id: open._id},
            {
                $set: {
                    status: "resolved",
                    resolvedAt: new Date(),
                    resolvedBy: "system",
                    updatedAt: new Date(),
                    resolution: {
                        type: "auto_resolved",
                        notes: "Condition no longer firing",
                        rootCause: null,
                    },
                },
            };
        resolved += 1;
    }
}

return {evaluated: rules.length, fired, resolved};
}

export async function acknowledgeAlert(alertId: string, userId: ObjectId, notes?: string, db?: Db) {
    const targetDb = db ?? (await getRawDb());
    await targetDb.collection<AlertDocument>("alerts").updateOne(
        {alertId},
        {
            $set: {
                status: "acknowledged",
                acknowledgedAt: new Date(),
                acknowledgedBy: userId,
                updatedAt: new Date(),
                ...(notes ? {"resolution.notes": notes} : {}),
            },
        };
}

export async function resolveAlert(
    alertId: string,
    resolvedBy: ObjectId | "system",
    notes?: string,
    rootCause?: string,
    db?: Db,
) {
    const targetDb = db ?? (await getRawDb());
    await targetDb.collection<AlertDocument>("alerts").updateOne(
        {alertId},
        {
            $set: {
                status: "resolved",
                resolvedAt: new Date(),
                resolvedBy,
export async function silenceAlert(alertId: string, silenceMinutes: number, notes?: string, db?: Db) {
  const targetDb = db ?? (await getRawDb());
  const silencedUntil = new Date(Date.now() + Math.max(1, silenceMinutes) * 60 * 1000);
  await targetDb.collection<AlertDocument>("alerts").updateOne(
    { alertId },
    {
      $set: {
        status: "silenced",
        silencedUntil,
        updatedAt: new Date(),
        resolution: {
          type: "silenced",
          notes: notes ?? null,
          rootCause: null,
        },
      },
    }
  );
}

export function defaultAlertRulesSeed(createdBy: ObjectId): AlertRuleDocument[] {
  const now = new Date();
  const make = (rule: Omit<AlertRuleDocument, "createdAt" | "updatedAt" | "createdBy">): AlertRuleDocument => ({
    ...rule,
    createdBy,
    createdat: now,
    updatedat: now,
  });

  return [
    make({
      ruleId: "rule_high_error_rate",
      name: "High Error Rate",
      description: "API error rate exceeds 5% for 5 minutes",
      isActive: true,
      condition: {
        type: "threshold",
        metric: "api.request.error",
        operator: "gt",
        value: 5,
        duration: 300,
        dimensions: null,
        changePercent: null,
        comparedTo: null,
        expectedMetric: null,
        maxAbsenceSeconds: null,
        logLevel: null,
        logPattern: null,
        countThreshold: null,
        windowSeconds: null,
      },
      severity: "critical",
      notifyChannels: ["admin_email", "admin_push"],
      cooldownMinutes: 5,
      autoResolve: true,
      autoResolveAfterMinutes: null,
      escalation: null,
      tags: ["api", "errors"],
    }),
    make({
      ruleId: "rule_slow_api",
      name: "Slow API Response",
      description: "API p95 duration greater than 5000ms",
      isActive: true,
      condition: {
        type: "threshold",
        metric: "api.request.duration",
        operator: "gt",
        value: 5000,
        duration: 300,
        dimensions: null,
        changePercent: null,
        comparedTo: null,
        expectedMetric: null,
        maxAbsenceSeconds: null,
        logLevel: null,
        logPattern: null,
        countThreshold: null,
        windowSeconds: null,
      },
      severity: "warning",
      notifyChannels: ["admin_email"],
      cooldownMinutes: 10,
      autoResolve: true,
      autoResolveAfterMinutes: null,
      escalation: null,
      tags: ["api", "latency"],
    }),
    make({
      ruleId: "rule_db_absence",
      name: "Database metrics absence",
      description: "No database query metrics in expected interval",
      isActive: true,
{
    condition: {
        type: "absence",
        metric: null,
        operator: "gt",
        value: 0,
        duration: 0,
        dimensions: null,
        changePercent: null,
        comparedTo: null,
        expectedMetric: "db.query.count",
        maxAbsenceSeconds: 600,
        logLevel: null,
        logPattern: null,
        countThreshold: null,
        windowSeconds: null
    },
    severity: "critical",
    notifyChannels: ["admin_email", "admin_push"],
    cooldownMinutes: 15,
    autoResolve: true,
    autoResolveAfterMinutes: null,
    escalation: null,
    tags: ["db", "metrics"],
},
make({
    ruleId: "rule_subscription_errors",
    name: "Subscription expiry processing errors",
    description: "Subscription expiry cron emits repeated errors",
    isActive: true,
    condition: {
        type: "pattern",
        metric: null,
        operator: "gt",
        value: 0,
        duration: 0,
        dimensions: null,
        changePercent: null,
        comparedTo: null,
        expectedMetric: null,
        maxAbsenceSeconds: null,
        logLevel: "error",
        logPattern: "subscription|expiry",
        countThreshold: 3,
        windowSeconds: 3600
    },
    severity: "critical",
    notifyChannels: ["admin_email", "admin_push"],
    cooldownMinutes: 30,
    autoResolve: true,
    autoResolveAfterMinutes: null,
    escalation: null,
    tags: ["subscription", "cron"]
});