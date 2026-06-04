import type {Db, ObjectId} from "mongodb";
import {getRawDb} from "../db.js";

export interface MonitoringConfig {
    _id: "global";
    logging: {
        defaultLevel: "debug" | "info" | "warn" | "error" | "fatal";
        levelOverrides: Record<string, "debug" | "info" | "warn" | "error" | "fatal">;
        sampleRate: Record<"debug" | "info" | "warn" | "error" | "fatal", number>;
        sensitiveFields: string[];
        maxLogSize: number;
        retentionDays: Record<"debug" | "info" | "warn" | "error" | "fatal", number>;
    };
    metrics: {
        enabled: boolean;
        collectionInterval: number;
        retentionDays: {
            raw: number;
            "5min": number;
            "1hour": number;
            "1day": number;
        };
        standardMetrics: Record<string, boolean>;
        customMetrics: Array<{
            name: string;
            type: string;
            description: string;
            unit: string;
            dimensions: string[];
        }>;
    };
    healthChecks: {
        enabled: boolean;
        globalInterval: number;
        statusPagePublic: boolean;
        statusPageUrl: string;
    };
    alerting: {
        enabled: boolean;
        globalCooldownMinutes: number;
        maxAlertsPerHour: number;
        channels: {
            adminEmail: {enabled: boolean; recipients: string[]};
            adminPush: {enabled: boolean};
            webhook: {
                enabled: boolean;
                url: string | null;
                secret: string | null;
                headers: Record<string, string> | null;
            };
            slack: {enabled: boolean; webhookUrl: string | null};
        };
        quietHours: {
            enabled: boolean;
            startTime: string;
            endTime: string;
            timezone: string;
            suppressSeverities: Array<"info" | "warning" | "critical" | "emergency">
        };
    };
    dashboards: {
        refreshInterval: number;
        defaultTimeRange: string;
        retainDashboardSnapshots: boolean;
    };
    updatedAt: Date;
    updatedBy: ObjectId | null;
}

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
    _id: "global",
    logging: {
        defaultLevel: (process.env.LOG_LEVEL as MonitoringConfig["logging"]["defaultLevel"]) || "info",
        levelOverrides: {
            "api.auth": "debug",
            scheduler: "info",
        },
        sampleRate: {
            debug: 0.1,
            info: 1,
            warn: 1,
            error: 1,
            fatal: 1,
        },
        sensitiveFields: [
            "password",
            "passwordHash",
            "token",
            "apiKey",
            "apiSecret",
            "creditCard",
            "ssn",
            "refreshToken",
            "verificationToken",
            "authorization",
            "cookie",
        ],
        maxLogSize: 10_000,
        retentionDays: {
            debug: 7,
            info: 30,
            warn: 60,
            error: 90,
            fatal: 365,
},
metrics: {
    enabled: process.env.METRICS_ENABLED !== "false",
    collectionInterval: 60,
    retentionDays: {
        raw: 7,
        "5min": 30,
        "1hour": 90,
        "1day": 365,
    },
    standardMetrics: {
        requestDuration: true,
        requestCount: true,
        errorRate: true,
        dbQueryDuration: true,
        dbConnectionPool: true,
        activeUsers: true,
        examSessions: true,
        cacheHitRate: true,
        queueDepth: true,
        memoryUsage: true,
    },
    customMetrics: [],
},
healthChecks: {
    enabled: true,
    globalInterval: 60,
    statusPagePublic: process.env.STATUS_PAGE_ENABLED !== "false",
    statusPageUrl: "/status",
},
alerting: {
    enabled: true,
    globalCooldownMinutes: 5,
    maxAlertsPerHour: 50,
    channels: {
        adminEmail: {
            enabled: true,
            recipients: (process.env.ALERT_EMAIL_RECIPIENTS || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
        },
        adminPush: { enabled: true },
        webhook: {
            enabled: Boolean(process.env.ALERT_WEBHOOK_URL),
            url: process.env.ALERT_WEBHOOK_URL || null,
            secret: process.env.ALERT_WEBHOOK_SECRET || null,
            headers: null,
        },
        slack: {
            enabled: false,
            webhookUrl: null,
        },
    },
    quietHours: {
        enabled: false,
        startTime: "22:00",
        endTime: "07:00",
        timezone: "Asia/Manila",
        suppressSeverities: ["info", "warning"],
    },
},
dashboards: {
    refreshInterval: 30,
    defaultTimeRange: "1h",
    retainDashboardSnapshots: false,
},
updatedAt: new Date(),
updatedBy: null,
};

let cachedConfig: MonitoringConfig | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

function deepMerge<T>(base: T, incoming: Partial<T> | null | undefined): T {
    if (!incoming) return base;
    const output = {...(base as object)} as Record<string, unknown>;
    for (const [key, value] of Object.entries(incoming)) {
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            baseValue &&
            typeof baseValue === "object" &&
            !Array.isArray(baseValue)
        ) {
            output[key] = deepMerge(
                baseValue as Record<string, unknown>,
                value as Record<string, unknown>,
            );
        } else {
            output[key] = value;
        }
    }
    return output as T;
}

export async function getMonitoringConfig(db?: Db): Promise<MonitoringConfig> {
    const now = Date.now();
    if (cachedConfig && now - cachedAt < CACHE_MS) {
        return cachedConfig;
export async function saveMonitoringConfig(
    patch: Partial<MonitoringConfig>,
    updatedBy: ObjectId | null,
    db?: Db,
): Promise<MonitoringConfig> {
    const targetDb = db ?? (await getRawDb());
    const current = await getMonitoringConfig(targetDb);
    const next = deepMerge<MonitoringConfig>(current, patch);
    next.updatedAt = new Date();
    next.updatedBy = updatedBy;
    await targetDb.collection<MonitoringConfig>("monitoring_config").updateOne(
        {_id: "global"},
        {$set: next},
        {upsert: true},
    );
    cachedConfig = next;
    cachedAt = Date.now();
    return next;
}