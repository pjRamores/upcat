import {AsyncLocalStorage} from "node:async_hooks";
import {randomUUID} from "node:crypto";
import type {NextFunction, Request, Response} from "express";
import {createLogger, type Logger} from "./logger.js";
import {metricsCollector} from "./metrics.js";

export interface RequestMonitoringState {
  logger: Logger;
  requestId: string;
  traceId: string;
  spanId: string;
  startedAt: bigint;
  dbQueries: number;
  dbQueryTime: number;
  externalCalls: number;
  externalCallTime: number;
}

const als = new AsyncLocalStorage<RequestMonitoringState>();

function normalizePath(path: string): string {
  return path
  .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, "/:id")
  .replace(/\/[0-9]+(?=\/|$)/g, "/:num");
}

function detectUserId(req: Request): string | null {
  const token = req.headers.authorization;
  if (!token || !token.startsWith("Bearer")) return null;
  try {
    const parts = token.slice(7).split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export function requestMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = String(req.headers["x-request-id"] || randomUUID());
  const traceId = String(req.headers["x-trace-id"] || randomUUID().replace(/-/g, ""));
  const spanId = randomUUID().replace(/-/g, "").slice(0, 16);
  const userId = detectUserId(req);

  const logger = createLogger("api", {
    requestId,
    traceId,
    spanId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress || null,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
    userId,
    sessionId: typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null,
  });

  res.setHeader("X-Request-Id", requestId);

  const state: RequestMonitoringState = {
    logger,
    requestId,
    traceId,
    spanId,
    startedAt: process.hrtime.bigint(),
    dbQueries: 0,
    dbQueryTime: 0,
    externalCalls: 0,
    externalCallTime: 0,
  };

  als.run(state, () => {
    logger.debug("Request started", {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
    res.on("finish", () => {
      const duration = Number(process.hrtime.bigint() - state.startedAt) / 1_000_000;
      const endpoint = normalizePath(req.path);
      const statusCode = res.statusCode;
      const level = statusCode >= 500 || duration > Number(process.env.SLOW_REQUEST_THRESHOLD_MS || "3000")
        ? statusCode >= 500
        ? "error"
        : "warn"
        : statusCode >= 400
        ? "warn"
        : "info";
      const payload = {
        method: req.method,
        path: req.path,
        endpoint,
        statusCode,
        duration: Math.round(duration),
        contentLength: Number(res.getHeader("content-length") || 0),
      };
      if (level === "error") {
        logger.error("Request completed", null, payload);
      } else if (level === "warn") {
logger.warn("Request completed", payload);
} else {
logger.info("Request completed", payload);
}

metricsCollector.counter("api.request.count", 1, {
method: req.method,
endpoint,
statusCode: String(statusCode),
service: "api",
});
metricsCollector.histogram("api.request.duration", duration, {
method: req.method,
endpoint,
statusCode: String(statusCode),
service: "api",
});
metricsCollector.gauge("api.request.active", 0, {service: "api"});

if (statusCode >= 400) {
metricsCollector.counter("api.request.error", 1, {
method: req.method,
endpoint,
statusCode: String(statusCode),
});
}

if (duration > Number(process.env.SLOW_REQUEST_THRESHOLD_MS || "3000")) {
logger.warn("perf.request.slow", {
path: req.path,
method: req.method,
duration,
threshold: Number(process.env.SLOW_REQUEST_THRESHOLD_MS || "3000"),
});
}
});

metricsCollector.gauge("api.request.active", 1, {service: "api"});
next();
});
}

export function getMonitoringState(): RequestMonitoringState | null {
return als.getStore() ?? null;
}

export function getRequestLogger(): Logger {
const state = getMonitoringState();
return state?.logger ?? createLogger("api");
}

export function trackDbQuery(durationMs: number) {
const state = getMonitoringState();
if (!state) return;
state.dbQueries += 1;
state.dbQueryTime += durationMs;
}