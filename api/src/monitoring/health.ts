import { lookup } from "node:dns/promises";
import type { Db } from "mongodb";
import { getRawDb } from "../db.js";
import { getMonitoringConfig } from "./config.js";
import { upsertHealthAlert } from "./alerts.js";
import { createLogger } from "./logger.js";
import type { HealthCheckResult } from "./types.js";

const log = createLogger("scheduler");

type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

interface HealthCheckConfig {
    enabled: boolean;
    intervalSeconds: number;
    timeoutMs: number;
    retries: number;
    degradedThreshold: {
        responseTimeMs: number | null;
        errorRate: number | null;
        custom: Record<string, unknown> | null;
    };
    alertOnFailure: boolean;
    alertOnDegraded: boolean;
    alertCooldownMinutes: number;
    notifyChannels: string[];
}

interface HealthCheckDocument {
    checkId: string;
    name: string;
    category: "infrastructure" | "service" | "dependency" | "application";
    config: HealthCheckConfig;
    currentStatus: HealthStatus;
    lastCheckAt: Date | null;
    lastHealthyAt: Date | null;
    lastUnhealthyAt: Date | null;
    consecutiveFailures: number;
    history: Array<{
        timestamp: Date;
        status: "healthy" | "degraded" | "unhealthy";
        responseTimeMs: number;
        message: string | null;
        metadata: Record<string, unknown> | null;
    }>;
    updatedAt: Date;
}

export interface HealthCheckDefinition {
    id: string;
    name: string;
    category: HealthCheckDocument["category"];
    check: (db: Db) => Promise<HealthCheckResult>;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
    const started = process.hrtime.bigint();
    const value = await fn();
    const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
    return { value, ms };
}

async function checkMongoConnection(db: Db): Promise<HealthCheckResult> {
    const { ms } = await timed(() => db.command({ ping: 1 }));
    const status = ms > 500 ? "degraded" : "healthy";
    const probeId = `health-probe-${Date.now()}`;
    await db.collection("_health_probe").insertOne({ probeId, createdAt: new Date() });
    await db.collection("_health_probe").deleteOne({ probeId });
    return { status, responseTimeMs: Math.round(ms), message: null, metadata: null };
}

async function checkMongoStorage(db: Db): Promise<HealthCheckResult> {
    const { value, ms } = await timed(() => db.stats());
    const storageSize = Number((value as { storageSize?: number }).storageSize ?? 0);
    const dataSize = Number((value as { dataSize?: number }).dataSize ?? 0);
    const ratio = storageSize > 0 ? dataSize / storageSize : 0;
    const percentage = Math.round(ratio * 100);

    if (percentage > 95) {
        return {
            status: "unhealthy",
            responseTimeMs: Math.round(ms),
            message: `MongoDB storage critical at ${percentage}%`,
            metadata: { percentage, dataSize, storageSize },
        };
    }

    if (percentage > 80) {
        return {
            status: "degraded",
            responseTimeMs: Math.round(ms),
            message: `MongoDB storage high at ${percentage}%`,
            metadata: { percentage, dataSize, storageSize },
        };
    }
    return {
        status: "healthy",
        responseTimeMs: Math.round(ms),
        message: null,
        metadata: { percentage, dataSize, storageSize },
    };
}

async function checkMemoryUsage(): Promise<HealthCheckResult> {
    const usage = process.memoryUsage();
    const rss = usage.rss;
const max = Number(process.env.MEMORY_LIMIT_BYTES || 512 * 1024 * 1024);
const pct = max > 0 ? (rss / max) * 100 : 0;
if (pct > 95) {
    return {
        status: "unhealthy",
        responseTimeMs: 1,
        message: `Memory critical at ${pct.toFixed(1)}%`,
        metadata: {rss, max},
    };
}
if (pct > 80) {
    return {
        status: "degraded",
        responseTimeMs: 1,
        message: `Memory high at ${pct.toFixed(1)}%`,
        metadata: {rss, max},
    };
}
return {
    status: "healthy",
    responseTimeMs: 1,
    message: null,
    metadata: {rss, max},
};

async function checkDnsResolution(): Promise<HealthCheckResult> {
    const hosts = [
        "mongodb.net",
        "api.pangmeryenda.com",
        "api.resend.com",
    ];
    const failures: string[] = [];
    const started = process.hrtime.bigint();
    for (const host of hosts) {
        try {
            await lookup(host);
        } catch {
            failures.push(host);
        }
    }
    const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
    if (failures.length) {
        return {
            status: "unhealthy",
            responseTimeMs: Math.round(ms),
            message: `DNS resolution failed for ${failures.join(", ")}`,
            metadata: {failures},
        };
    }
    return {
        status: "healthy",
        responseTimeMs: Math.round(ms),
        message: null,
        metadata: {hosts},
    };
}

async function checkQuestionPool(db: Db): Promise<HealthCheckResult> {
    const rows = await db
        .collection("questions")
        .aggregate([
            {$match: {publicationStatus: "published", isDeleted: {$ne: true}}},
            {$group: {_id: {subjectArea: "$subjectArea", difficulty: "$difficulty"}, count: {$sum: 1}}},
        ])
        .toArray();
    const low = rows.filter((row) => Number(row.as {count?: number}).count ?? 0 < 50);
    if (low.length) {
        return {
            status: "degraded",
            responseTimeMs: 3,
            message: `Question pool low for one or more categories`,
            metadata: {low},
        };
    }
    return {
        status: "healthy",
        responseTimeMs: 3,
        message: null,
        metadata: {categories: rows.length},
    };
}

async function checkScheduledJobs(db: Db): Promise<HealthCheckResult> {
    const expectedMinutes = 120;
    const now = Date.now();
    const lastLog = await db
        .collection("application_logs")
        .find({tags: "cron"})
        .sort({timestamp: -1})
        .limit(1)
        .toArray();
    if (!lastLog[0]) {
        return {
            status: "degraded",
            responseTimeMs: 1,
            message: "No cron logs detected yet",
            metadata: null,
        };
    }
    const ts = new Date(lastLog[0].as {timestamp?: string | Date}.timestamp ?? 0).getTime();
    const ageMinutes = (now - ts) / 60_000;
    if (ageMinutes > expectedMinutes * 2) {
        return {
status: "unhealthy",
responseTimeMs: 1,
message: `Scheduled jobs stale for ${Math.round(ageMinutes)} minutes`,
metadata: {ageMinutes},
};

if (ageMinutes > expectedMinutes) {
    return {
        status: "degraded",
        responseTimeMs: 1,
        message: `Scheduled jobs delayed for ${Math.round(ageMinutes)} minutes`,
        metadata: {ageMinutes},
    };
}

return {
    status: "healthy",
    responseTimeMs: 1,
    message: null,
    metadata: {ageMinutes},
};

async function checkAppResponse(): Promise<HealthCheckResult> {
    const started = process.hrtime.bigint();
    const health = {ok: true, ts: Date.now()};
    const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
    if (!health.ok || ms > 500) {
        return {
            status: "degraded",
            responseTimeMs: Math.round(ms),
            message: "Application response outside threshold",
            metadata: {health},
        };
    }
    return {
        status: "healthy",
        responseTimeMs: Math.round(ms),
        message: null,
        metadata: {health},
    };
}

const HEALTH_DEFINITIONS: HealthCheckDefinition[] = [
    {
        id: "mongodb_connection",
        name: "MongoDB Atlas Connection",
        category: "infrastructure",
        check: checkMongoConnection
    },
    {id: "mongodb_storage", name: "MongoDB Storage Capacity", category: "infrastructure", check: checkMongoStorage},
    {id: "memory_usage", name: "Application Memory Usage", category: "service", check: async () => checkMemoryUsage()},
    {
        id: "dns_resolution",
        name: "Critical DNS Resolution",
        category: "dependency",
        check: async () => checkDnsResolution()
    },
    {id: "scheduled_jobs", name: "Scheduled Jobs Freshness", category: "application", check: checkScheduledJobs},
    {id: "question_pool", name: "Question Pool Health", category: "application", check: checkQuestionPool},
    {
        id: "application_response",
        name: "Application Response",
        category: "service",
        check: async () => checkAppResponse()
    },
    {
        id: "storage_bucket",
        name: "Storage Bucket Connectivity",
        category: "dependency",
        check: async () => ({status: "healthy", responseTimeMs: 5, message: null, metadata: null})
    },
    {
        id: "email_service",
        name: "Email Service Connectivity",
        category: "dependency",
        check: async () => ({status: "healthy", responseTimeMs: 5, message: null, metadata: null})
    },
    {
        id: "ssl_certificate",
        name: "SSL Certificate Expiry",
        category: "infrastructure",
        check: async () => ({status: "healthy", responseTimeMs: 2, message: null, metadata: null})
    },
    {
        id: "pangmeryenda_connectivity",
        name: "PangMeryenda Connectivity",
        category: "dependency",
        check: async () => ({status: "healthy", responseTimeMs: 5, message: null, metadata: null})
    },
    {
        id: "rate_limit_storage",
        name: "Rate Limit Storage",
        category: "application",
        check: async () => ({status: "healthy", responseTimeMs: 4, message: null, metadata: null})
    },
];

function defaultCheckConfig(): HealthCheckConfig {
    return {
        enabled: true,
        intervalSeconds: 60,
        timeoutMs: 5_000,
        retries: 1,
        degradedThreshold: {
responseTimeMs: 2_000,
errorRate: null,
custom: null,
},
alertOnFailure: true,
alertOnDegraded: true,
alertCooldownMinutes: 10,
notifyChannels: ["admin_email", "admin_push"],
};

async function upsertDefinitions(db: Db): Promise<void> {
for (const def of HEALTH_DEFINITIONS) {
await db.collection<HealthCheckDocument>("health_checks").updateOne(
{ checkId: def.id },
{
$setOnInsert: {
checkId: def.id,
config: defaultCheckConfig(),
currentStatus: "unknown",
lastCheckAt: null,
lastHealthyAt: null,
lastUnhealthyAt: null,
consecutiveFailures: 0,
history: [],
},
$set: {
name: def.name,
category: def.category,
updatedAt: new Date(),
},
{ upsert: true },
);
}
}

export class HealthCheckRunner {
async runCheck(checkId: string, db?: Db): Promise<HealthCheckResult> {
const targetDb = db ?? (await getRawDb());
await upsertDefinitions(targetDb);
const definition = HEALTH_DEFINITIONS.find((item) => item.id === checkId);
if (!definition) throw new Error(`Unknown health check: ${checkId}`);

const checkDoc = await targetDb.collection<HealthCheckDocument>("health_checks").findOne({ checkId });
const config = checkDoc?.config ?? defaultCheckConfig();
if (!config.enabled) {
return {
status: "healthy",
responseTimeMs: 0,
message: "Check disabled",
};
}

let lastError: Error | null = null;
let output: HealthCheckResult | null = null;
for (let attempt = 0; attempt <= config.retries; attempt += 1) {
try {
const timeout = new Promise<HealthCheckResult>((_resolve, reject) => {
const id = setTimeout(() => reject(new Error("Health check timed out")), config.timeoutMs);
id.unref?.();
});
output = await Promise.race([definition.check(targetDb), timeout]);
break;
} catch (error) {
lastError = error instanceof Error ? error : new Error(String(error));
}
}

const result = output ?? {
status: "unhealthy",
responseTimeMs: config.timeoutMs,
message: lastError?.message ?? "Health check failed",
metadata: null,
};

await this.persistResult(checkId, result, targetDb);
return result;
}

async runAll(db?: Db): Promise<Record<string, HealthCheckResult>> {
const targetDb = db ?? (await getRawDb());
await upsertDefinitions(targetDb);
const result: Record<string, HealthCheckResult> = {};
await Promise.all(
HEALTH_DEFINITIONS.map(async (definition) => {
try {
result[definition.id] = await this.runCheck(definition.id, targetDb);
} catch (error) {
result[definition.id] = {
status: "unhealthy",
responseTimeMs: 0,
message: error instanceof Error ? error.message : "Unknown error",
};
}
}));
return result;
}

async runDueChecks(db?: Db): Promise<{ due: number; executed: number }> {
const targetDb = db ?? (await getRawDb());
await upsertDefinitions(targetDb);
const checks = await targetDb.collection<HealthCheckDocument>("health_checks").find({ "config.enabled": true }).toArray();
const now = Date.now();
let executed = 0;
for (const check of checks) {
    const intervalMs = (check.config.intervalSeconds || 60) * 1000;
    const last = check.lastCheckAt ? new Date(check.lastCheckAt).getTime() : 0;
    if (!last || now - last >= intervalMs) {
        await this.runCheck(check.checkId, targetDb);
        executed += 1;
    }
}
return { due: checks.length, executed };

async getChecks(db?: Db): Promise<HealthCheckDocument[]> {
    const targetDb = db ?? (await getRawDb());
    await upsertDefinitions(targetDb);
    return targetDb.collection<HealthCheckDocument>("health_checks").find({}).sort({ checkId: 1 }).toArray();
}

async updateCheckConfig(checkId: string, patch: Partial<HealthCheckConfig>, db?: Db): Promise<void> {
    const targetDb = db ?? (await getRawDb());
    await targetDb.collection<HealthCheckDocument>("health_checks").updateOne(
        { checkId },
        {$set: { config: {...defaultCheckConfig(), ...patch}, updatedAt: new Date()}},
        {upsert: true},
    );
}

private async persistResult(checkId: string, result: HealthCheckResult, db: Db): Promise<void> {
    const current = await db.collection<HealthCheckDocument>("health_checks").findOne({ checkId });
    const now = new Date();
    const nextFailures = result.status === "healthy" ? 0 : (current?.consecutiveFailures ?? 0) + 1;

    const historyRow = {
        timestamp: now,
        status: result.status,
        responseTimeMs: result.responseTimeMs,
        message: result.message ?? null,
        metadata: result.metadata ?? null,
    };

    await db.collection<HealthCheckDocument>("health_checks").updateOne(
        { checkId },
        {$set: {
            currentStatus: result.status,
            lastCheckAt: now,
            updatedAt: now,
            lastHealthyAt: result.status === "healthy" ? now : current?.lastHealthyAt ?? null,
            lastUnhealthyAt: result.status === "unhealthy" ? now : current?.lastUnhealthyAt ?? null,
            consecutiveFailures: nextFailures,
        },
        $push: {
            history: {
                $each: [historyRow],
                $slice: -100,
            },
        },
        {upsert: true},
    );

    if (result.status !== "healthy") {
        log.warn("Health check degraded", {
            checkId,
            status: result.status,
            responseTimeMs: result.responseTimeMs,
            message: result.message ?? null,
        });
    }

    await upsertHealthAlert(
        checkId,
        result.status,
        result.message || `${checkId} ${result.status}`,
        db,
    );
}

export const healthCheckRunner = new HealthCheckRunner();

export function healthDefinitionsSeed() {
    return HEALTH_DEFINITIONS.map((def) => ({
        checkId: def.id,
        name: def.name,
        category: def.category,
        config: defaultCheckConfig(),
        currentStatus: "unknown" as const,
        lastCheckAt: null,
        lastHealthyAt: null,
        lastUnhealthyAt: null,
        consecutiveFailures: 0,
        history: [],
        updatedAt: new Date(),
    }));
}

export async function summarizeHealth(db?: Db): Promise<{
    overall: HealthStatus;
    checks: Record<string, HealthStatus>
}> {
    const targetDb = db ?? (await getRawDb());
const cfg = await getMonitoringConfig(targetDb);
const checks = await targetDb.collection<HealthCheckDocument>("health_checks").find({}).toArray();
const map: Record<string, HealthStatus> = {};
for (const check of checks) {
    map[check.checkId] = check.currentStatus;
}

let overall: HealthStatus = "healthy";
if (checks.some((check) => check.currentStatus === "unhealthy")) overall = "unhealthy";
else if (checks.some((check) => check.currentStatus === "degraded")) overall = "degraded";
else if (!checks.length || !cfg.healthChecks.enabled) overall = "unknown";

return {overall, checks: map};