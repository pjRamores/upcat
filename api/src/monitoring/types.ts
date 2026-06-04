import type { ObjectId } from "mongodb";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface MonitoringRequestContext {
    requestId: string;
    traceId: string;
    spanId: string;
    parentSpanId: string | null;
    method: string | null;
    path: string | null;
    ip: string | null;
    userAgent: string | null;
    userId: string | null;
    sessionId: string | null;
    statusCode: number | null;
    duration: number | null;
}

export interface LoggerContext {
    service: string;
    environment: string;
    version: string;
    instance: string;
    region: string | null;
    request?: MonitoringRequestContext | null;
    trace?: {
        traceId: string | null;
        spanId: string | null;
        parentSpanId: string | null;
    } | null;
    [key: string]: unknown;
}

export interface LogPerformanceData {
    cpuTime: number | null;
    memoryUsed: number | null;
    dbQueries: number | null;
    dbQueryTime: number | null;
    externalCalls: number | null;
    externalCallTime: number | null;
}

export interface ApplicationLogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context: {
        service: string;
        environment: string;
        version: string;
        instance: string;
        region: string | null;
    };
    request: MonitoringRequestContext | null;
    error: {
        name: string;
        message: string;
        stack: string | null;
        code: string | null;
        originalError: Record<string, unknown> | null;
    } | null;
    data: Record<string, unknown> | null;
    tags: string[];
    performance: LogPerformanceData | null;
    trace: {
        traceId: string | null;
        spanId: string | null;
        parentSpanId: string | null;
    } | null;
}

export type MetricType = "counter" | "gauge" | "histogram" | "summary";

export interface MetricDocument {
    name: string;
    type: MetricType;
    value: number;
    dimensions: Record<string, string | null>;
    timestamp: Date;
    bucket: string;
    histogram: {
        count: number;
        sum: number;
        min: number;
        max: number;
        p50: number;
        p90: number;
        p95: number;
        p99: number;
        buckets: Array<{ le: number; count: number }>;
    } | null;
}

export interface AlertDocument {
    alertId: string;
    source: {
        type: "health_check" | "metric_threshold" | "error_rate" | "anomaly" | "log_pattern" | "system_event";
        checkId: string | null;
        metricName: string | null;
        ruleId: string | null;
    };
    severity: "info" | "warning" | "critical" | "emergency";
}
title: string;
description: string;
status: "firing" | "acknowledged" | "resolved" | "silenced";
firedAt: Date;
acknowledgedAt: Date | null;
acknowledgedBy: ObjectId | null;
resolvedAt: Date | null;
resolvedBy: ObjectId | "system" | null;
silencedUntil: Date | null;
context: {
    currentValue: number | string | null;
    threshold: number | string | null;
    duration: string | null;
    affectedComponents: string[];
    relatedLogIds: ObjectId[] | null;
    relatedMetrics: Record<string, unknown> | null;
};
notifications: Array<{
    channel: string;
    sentAt: Date;
    recipient: string;
    status: "sent" | "failed";
}>;
resolution: {
    type: "auto_resolved" | "manual" | "silenced" | null;
    notes: string | null;
    rootCause: string | null;
} | null;
occurrenceCount: number;
lastOccurrence: Date;
createdAt: Date;
updatedAt: Date;
}

export interface HealthCheckResult {
    status: "healthy" | "degraded" | "unhealthy";
    responseTimeMs: number;
    message?: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface AlertRuleDocument {
    ruleId: string;
    name: string;
    description: string;
    isActive: boolean;
    condition: {
        type: "threshold" | "anomaly" | "absence" | "rate_change" | "pattern";
        metric: string | null;
        operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne";
        value: number;
        duration: number;
        dimensions: Record<string, string | null> | null;
        changePercent: number | null;
        comparedTo: "previous_period" | "baseline" | null;
        expectedMetric: string | null;
        maxAbsenceSeconds: number | null;
        logLevel: string | null;
        logPattern: string | null;
        countThreshold: number | null;
        windowSeconds: number | null;
    };
    severity: "info" | "warning" | "critical" | "emergency";
    notifyChannels: string[];
    cooldownMinutes: number;
    autoResolve: boolean;
    autoResolveAfterMinutes: number | null;
    escalation: {
        enabled: boolean;
        escalateAfterMinutes: number;
        escalateTo: string[];
        escalateSeverity: string;
    } | null;
    tags: string[];
    createdBy: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}