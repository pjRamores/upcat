import {randomUUID} from "node:crypto";
import type {Db} from "mongodb";
import {getRawDb} from "../db.js";
import {getMonitoringConfig} from "./config.js";
import {metricsCollector} from "./metrics.js";
import type {
  ...ApplicationLogEntry,
  ...LoggerContext,
  ...LogLevel,
  ...LogPerformanceData,
  ...MonitoringRequestContext,
} from "./types.js";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  const trimmed = local.trim();
  const first = trimmed.charAt(0) || "*";
  return `${first}***@${domain}`;
}

function safeSerialize(value: unknown): unknown {
  const seen = new WeakSet<object>();
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (typeof v === "bigint") return String(v);
      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[CIRCULAR]";
        seen.add(v);
      }
      return v;
    }),
  ) as unknown;
}

function truncateString(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 14))}...[TRUNCATED]`;
}

function sanitizeValue(value: unknown, sensitive: string[], maxLogSize: number, depth: 0): unknown {
  if (depth > 10) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (value.includes("@") && !value.includes(".")) {
      return truncateString(maskEmail(value), maxLogSize);
    }
    return truncateString(value, maxLogSize);
  }

  if (typeof value === "number") || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item) => sanitizeValue(item, sensitive, maxLogSize, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (sensitive.some((field) => lower.includes(field.toLowerCase()))) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = sanitizeValue(child, sensitive, maxLogSize, depth + 1);
      }
    }
    return out;
  }

  return String(value);
}

function requestFromContext(ctx: LoggerContext): MonitoringRequestContext | null {
  return ctx.request ?? null;
}

export interface LoggerWriteInput {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown> | null;
  error?: Error | null;
  tags?: string[];
  performance?: Partial<LogPerformanceData> | null;
}

export class Logger {
  private readonly context: LoggerContext;

  constructor(context: LoggerContext) {
    this.context = context;
  }

  child(additionalContext: Partial<LoggerContext>): Logger {
    return new Logger({...this.context, ...additionalContext});
  }
}
debug(message: string, data?: Record<string, unknown>) {
  this.write({level: "debug", message, data});
}

info(message: string, data?: Record<string, unknown>) {
  this.write({level: "info", message, data});
}

warn(message: string, data?: Record<string, unknown>) {
  this.write({level: "warn", message, data});
}

error(message: string, error?: Error | null, data?: Record<string, unknown>) {
  this.write({level: "error", message, error: error ?? null, data});
}

fatal(message: string, error?: Error | null, data?: Record<string, unknown>) {
  this.write({level: "fatal", message, error: error ?? null, data});
}

event(eventName: string, data: Record<string, unknown>) {
  this.info(eventName, {eventName, ...data});
}

metric(name: string, value: number, dimensions: Record<string, string | number | boolean | null> = {}) {
  metricsCollector.histogram(name, value, dimensions);
}

startTimer(label: string) {
  const start = process.hrtime.bigint();
  return () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    this.metric("app.timer", ms, {label, service: this.context.service});
    return ms;
  };
}

private async shouldLog(level: LogLevel, db?: Db): Promise<boolean> {
  const cfg = await getMonitoringConfig(db);
  const base = cfg.logging.defaultLevel;
  const key = [this.context.service, requestFromContext(this.context)?.path]
    .filter(Boolean)
    .join(".")
    .toLowerCase();
  const override = cfg.logging.levelOverrides[key];
  const required = LEVEL_PRIORITY[override ?? base];
  if (LEVEL_PRIORITY[level] < required) return false;
  const sample = cfg.logging.sampleRate[level] ?? 1;
  return Math.random() <= sample;
}

private toLogDoc(input: LoggerWriteInput, cfg: Awaited<ReturnType<typeof getMonitoringConfig>>): ApplicationLogEntry {
  const request = requestFromContext(this.context);
  const sanitizedData = sanitizeValue(
    safeSerialize(input.data ?? null),
    cfg.logging.sensitiveFields,
    cfg.logging.maxLogSize,
  ) as Record<string, unknown> | null;

  const err = input.error
    ? {
      name: input.error.name,
      message: truncateString(input.error.message || "Unknown error", cfg.logging.maxLogSize),
      stack: input.error.stack ? truncateString(input.error.stack, cfg.logging.maxLogSize) : null,
      code: ((input.error as Error & {code?: string}).code ?? null) as string | null,
      originalError: sanitizeValue(
        safeSerialize(input.error),
        cfg.logging.sensitiveFields,
        cfg.logging.maxLogSize,
      ) as Record<string, unknown> | null,
    }
  : null;

  return {
    timestamp: new Date(),
    level: input.level,
    message: truncateString(input.message, cfg.logging.maxLogSize),
    context:
      {
        service: this.context.service,
        environment: this.context.environment,
        version: this.context.version,
        instance: this.context.instance,
        region: this.context.region,
      },
      request,
      error: err,
      data: sanitizedData,
      tags: Array.isArray(input.tags) ? input.tags.slice(0, 20) : [],
      performance: input.performance
    } ? {
      cpuTime: input.performance.cpuTime ?? null,
      memoryUsed: input.performance.memoryUsed ?? null,
      dbQueries: input.performance.dbQueries ?? null,
      dbQueryTime: input.performance.dbQueryTime ?? null,
      externalCalls: input.performance.externalCalls ?? null,
      externalCallTime: input.performance.externalCallTime ?? null,
    } : null,
    trace: this.context.trace ?? {
      traceId: request?.traceId ?? null,
      spanId: request?.spanId ?? null,
      parentSpanId: request?.parentSpanId ?? null,
    },
  };
}
private write(input: LoggerWriteInput) {
  void this.persist(input);
}

private async persist(input: LoggerWriteInput) {
  const db = await getRawDb();
  const cfg = await getMonitoringConfig(db);
  if (!(await this.shouldLog(input.level, db))) return;

  const doc = this.toLogDoc(input, cfg);

  if (process.env.LOG_STDOUT !== "false") {
    const stdoutLine = {
      ts: doc.timestamp.toISOString(),
      level: doc.level,
      message: doc.message,
      service: doc.context.service,
      requestId: doc.request?.requestId ?? null,
      traceId: doc.trace?.traceId ?? null,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(stdoutLine));
  }

  try {
    await db.collection<ApplicationLogEntry>("application_logs").insertOne(doc);
  } catch {
    // eslint-disable-next-line no-console
    console.error("[monitoring] failed to persist log entry");
  }

  if (doc.level === "error") || doc.level === "fatal") {
    metricsCollector.counter("api.request.error", 1, {
      service: doc.context.service,
      endpoint: doc.request?.path ?? null,
      errorCode: doc.error?.code ?? null,
    });
  }
}

export function createLogger(service: string, request?: Partial<MonitoringRequestContext>): Logger {
  const req: MonitoringRequestContext | null = request
  ? {
    requestId: request.requestId ?? randomUUID(),
    traceId: request.traceId ?? randomUUID().replace(/-/g, ""),
    spanId: request.spanId ?? randomUUID().replace(/-/g, "").slice(0, 16),
    parentSpanId: request.parentSpanId ?? null,
    method: request.method ?? null,
    path: request.path ?? null,
    ip: request.ip ?? null,
    userAgent: request.userAgent ?? null,
    userId: request.userId ?? null,
    sessionId: request.sessionId ?? null,
    statusCode: request.statusCode ?? null,
    duration: request.duration ?? null,
  }
  : null;

  return new Logger({
    service,
    environment: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "dev",
    instance: process.env.FUNCTION_NAME || "local",
    region: process.env.VERCEL_REGION || process.env.AWS_REGION || null,
    request: req,
    trace: req
  });
}