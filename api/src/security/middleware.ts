/**
 * Phase 15 -- Security middleware composition (`withSecurity`).
 *
 * Vercel's Node runtime doesn't have Express-style chains, so we wrap
 * each handler:
 *
 * export default withSecurity({
 *   endpoint: "POST /api/auth/login",
 *   rateLimit: { perIp: { perMinute: 5, perHour: 20 } },
 *   requireCaptcha: "after-3-fails",
 *   })(async (req, res, ctx) => { ... });
 *
 * The wrapper runs these checks in order:
 * 1. CORS (preflight handled / blocked -> exit).
 * 2. Lockdown gate (admins allowed, others 503).
 * 3. requestId + clientIp populated on ctx.
 * 4. Block-list check (hard -> 403, soft -> ctx.isSoftBlocked = true).
 * 5. Request size & URL length limits.
 * 6. Sliding-window rate limits (global -> per-IP -> per-endpoint).
 * 7. Body sanitization (replaces `req.body` with a cleaned clone).
 * 8. Security response headers attached.
 * 9. Async IP-intelligence record (fire-and-forget).
 * 10. Handler invoked with 'ctx'.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { EndpointLimitConfig, RATE_WINDOWS, THREAT_SCORE_ADJUSTMENTS } from "@upcat/shared";
import { extractToken } from "../auth.js";
import { getSecurityConfig } from "../config.js";
import { checkBlocked } from "../blockedEntities.js";
import { applyCors, applySecurityHeaders, getAllowedOrigins } from "../headers.js";
import { adjustThreatScore, recordRequest } from "../ipintel.js";
import { logSecurityEvent } from "../events.js";
import { checkAndIncrement, type RateLimitResult } from "../rateLimit.js";
import { endpointKey, extractClientIp, isHealthEndpoint, matchEndpointKey, newRequestId, } from "../requestContext.js";
import { inspectPayload, sanitizePayload } from "../sanitize.js";

export interface SecurityContext {
  requestId: string;
  clientIp: string;
  fingerprint: string | null;
  userAgent: string | null;
  /** True when an active "soft" block matched (caller should require CAPTCHA). */
  isSoftBlocked: boolean;
  /** Resolved endpoint key (e.g. "POST /api/auth/login"). */
  endpoint: string;
}

export interface WithSecurityOptions {
  /** Override the auto-detected endpoint key. */
  endpoint?: string;
  /** Override the configured per-endpoint rate limits (rare). */
  rateLimit?: EndpointLimitConfig;
  /** Bypass rate limiting + lockdown (use for internal cron + health). */
  bypass?: boolean;
  /** Raise body size cap for this handler (e.g. file uploads). */
  maxBodyBytes?: number;
}

export type SecurityHandler = (
  req: VercelRequest,
  res: VercelResponse,
  ctx: SecurityContext,
) => Promise<void> | void;

const ADMIN_WHITELIST = new Set(
  (process.env.ADMIN_WHITELIST_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function withSecurity({ts: WithSecurityOptions = {}}) {
  return (handler: SecurityHandler) =>
    async (req: VercelRequest, res: VercelResponse): Promise<void> => {
      const url = req.url || "/";
      const cfg = await getSecurityConfig();
      const ctx: SecurityContext = {
        requestId: newRequestId(),
        clientIp: extractClientIp(req),
        fingerprint: pickHeader(req, "x-device-fingerprint"),
        userAgent: pickHeader(req, "user-agent"),
        isSoftBlocked: false,
        endpoint: opts.endpoint ?? endpointKey(req.method || "GET", url),
      };

      res.setHeader("X-Request-Id", ctx.requestId);

      // 1. CORS
      const cors = applyCors(req, res, { allowedOrigins: getAllowedOrigins() });
      if (cors === "preflight-handled") return;
      if (cors === "blocked") {
        void logSecurityEvent({
          type: "cors.unauthorized_origin",
          severity: "low",
          source: srcFromCtx(ctx),
          target: { type: "endpoint", value: ctx.endpoint },
          details: { origin: req.headers.origin ?? null },
          action: { taken: "blocked", automated: true },
        });
        void adjustThreatScore(ctx.clientIp, "cors_unauthorized");
        res.status(403).json({ success: false, error: "Origin not allowed." });
        return;
      }
// 9. Always attach response headers (must be set before status() ends).
applySecurityHeaders(res, cfg);

// Health checks are exempt from everything below.
if (isHealthEndpoint(url) || opts.bypass) {
    await handler(req, res, ctx);
    return;
}

// 2. Lockdown
if (cfg.lockdown.enabled && !isAdminBearer(req) && !ADMIN_WHITELIST.has(ctx.clientIp)) {
    res
        .status(503)
        .setHeader("Retry-After", "300")
        .json({ success: false, error: "Service temporarily unavailable." });
    return;
}

// 3. Block list
const block = await checkBlocked({
    ip: ctx.clientIp,
    userAgent: ctx.userAgent,
    fingerprint: ctx.fingerprint,
});
if (block) {
    if (block.severity === "hard") {
        void logSecurityEvent({
            type: "rate_limit.ip_blocked",
            severity: "high",
            source: srcFromCtx(ctx),
            target: { type: "endpoint", value: ctx.endpoint },
            details: { rule: block.rule_id, reason: block.rule.reason },
            action: { taken: "blocked", automated: true },
        });
        res.status(403).json({ success: false, error: "Access denied." });
        return;
    }
    ctx.isSoftBlocked = true;
}

// 4. Request size & URL length
const maxBody = opts.maxBodyBytes ?? cfg.dos.maxRequestBodySize;
const lenHeader = Number(req.headers["content-length"]);
if (Number.isFinite(lenHeader) && lenHeader > maxBody) {
    void logSecurityEvent({
        type: "input.payload_too_large",
        severity: "medium",
        source: srcFromCtx(ctx),
        target: { type: "endpoint", value: ctx.endpoint },
        details: { contentLength: lenHeader, max: maxBody },
        action: { taken: "rejected", automated: true },
    });
    void adjustThreatScore(ctx.clientIp, "payload_too_large");
    res.status(413).json({ success: false, error: "Payload too large." });
    return;
}
if (url.length > cfg.dos.maxUrlLength) {
    res.status(414).json({ success: false, error: "URI too long." });
    return;
}

// 5. Rate limits -- skip if IP is in whitelist.
if (!ADMIN_WHITELIST.has(ctx.clientIp)) {
    const token = extractToken(req);
    const rl = await runRateLimits(ctx, cfg, opts.rateLimit, token?.userId ?? null);
    if (rl) {
        applyRateHeaders(res, rl);
        void logSecurityEvent({
            type: "rate_limit.exceeded",
            severity: "medium",
            source: { ...srcFromCtx(ctx), userId: token?.userId ?? null },
            target: { type: "endpoint", value: ctx.endpoint },
            details: { scope: rl.scope, limit: rl.result.limit, count: rl.result.count },
            action: { taken: "rate_limited", automated: true },
        });
        void adjustThreatScore(
            ctx.clientIp,
            rl.result.count > rl.result.limit * 2 ? "rate_limit_repeat" : "rate_limit_first",
        );
        res
            .status(429)
            .json({ success: false, error: "Too many requests. Please slow down." });
        return;
    }
}

// 6. Input sanitization
if (req.body && typeof req.body === "object") {
    const inspection = inspectPayload(req.body);
    if (inspection.threats.length > 0) {
        for (const t of inspection.threats) {
            const evType =
                t === "xss_attempt"
                    ? "input.xss_attempt"
                    : t === "proto_pollution"
                    ? "input.proto_pollution"
                    : "input.injection_attempt";
            void logSecurityEvent({
                type: evType,
                severity: "high",
                source: srcFromCtx(ctx),
                target: { type: "endpoint", value: ctx.endpoint },
                details: { threat: t, paths: inspection.paths.slice(0, 5) },
                action: { taken: "rejected", automated: true },
            });
        }
    }
}
action: {taken: "sanitized", automated: true},
    });
    void adjustThreatScore(
        ctx.clientIp,
        t === "xss_attempt"
            ? "xss_attempt"
            : t === "proto_pollution"
            : "injection_attempt",
    );
    }
    (req as { body: unknown }).body = sanitizePayload(req.body);
}

// 7. Fire-and-forget IP intel record.
const token = extractToken(reg);
    void recordRequest({
        ip: ctx.clientIp,
        userAgent: ctx.userAgent,
        userId: token?.userId ?? null,
        fingerprint: ctx.fingerprint,
    });

    try {
        await handler(req, res, ctx);
    } catch (err) {
        // Last-resort error capture so we never leak stack traces.
        if (!res.writableEnded) {
            res.status(500).json({ success: false, error: "Internal error." });
        }
        // eslint-disable-next-line no-console
        console.error("[security] handler threw", err);
    };
}

function pickHeader(req: VercelRequest, name: string): string | null {
    const v = req.headers[name];
    if (!v) return null;
    return Array.isArray(v) ? v[0] ?? null : v;
}

function isAdminBearer(req: VercelRequest): boolean {
    return extractToken(req)?.role === "admin";
}

function srcFromCtx(ctx: SecurityContext) {
    return {
        ip: ctx.clientIp,
        userId: null,
        userAgent: ctx.userAgent,
        fingerprint: ctx.fingerprint,
        country: null,
    };
}

interface RateLimitHit {
    scope: "global" | "ip" | "ip_endpoint" | "user" | "user_endpoint";
    result: RateLimitResult;
}

async function runRateLimits(
    ctx: SecurityContext,
    cfg: Awaited<ReturnType<typeof getSecurityConfig>>,
    override: EndpointLimitConfig | undefined,
    userId: string | null,
): Promise<RateLimitHit | null> {
    // a) Global RPS
    const g = await checkAndIncrement({
        scope: "global",
        identifier: "global",
        endpoint: "*",
        limit: cfg.rateLimits.global.requestsPerSecond,
        windowMs: 1000,
    });
    if (g.limited) return { scope: "global", result: g };

    // b) Per-IP general (per-minute/hour/day) — fail-fast on any.
    for (const win of ["perMinute", "perHour", "perDay"] as const) {
        const limit =
            win === "perMinute"
                ? cfg.rateLimits.perIp.requestsPerMinute
                : win === "perHour"
                : cfg.rateLimits.perIp.requestsPerHour
                : cfg.rateLimits.perIp.requestsPerDay;
        const r = await checkAndIncrement({
            scope: "ip",
            identifier: ctx.clientIp,
            endpoint: `*${win}`,
            limit,
            windowMs: RATE_WINDOWS[win],
        });
        if (r.limited) return { scope: "ip", result: r };
    }

    // c) Per-endpoint per-IP
    const endpointCfg =
        override ??
        () => {
            const matched = matchEndpointKey(
                ctx.endpoint,
                cfg.rateLimits.endpoints as unknown as Record<string, unknown>,
            );
    return matched
        ? (cfg.rateLimits.endpoints as Record<string, EndpointLimitConfig>)[matched]
        : undefined;
})();

if (endpointCfg?.perIp) {
    for (const win of ["perMinute", "perHour", "perDay"] as const) {
        const limit = endpointCfg.perIp[win];
        if (!limit) continue;
        const r = await checkAndIncrement({
            scope: "ip",
            identifier: ctx.clientIp,
            endpoint: `${ctx.endpoint}#${win}`,
            limit,
            windowMs: RATE_WINDOWS[win],
        });
        if (r.limited) return { scope: "ip_endpoint", result: r };
    }
}

// (d) Per-user general
if (userId) {
    for (const win of ["perMinute", "perHour"] as const) {
        const limit =
            win === "perMinute"
                ? cfg.rateLimits.perUser.requestsPerMinute
                : cfg.rateLimits.perUser.requestsPerHour;
        const r = await checkAndIncrement({
            scope: "user",
            identifier: userId,
            endpoint: `${win}`,
            limit,
            windowMs: RATE_WINDOWS[win],
        });
        if (r.limited) return { scope: "user", result: r };
    }
}

// (e) Per-endpoint per-user
if (endpointCfg?.perUser) {
    for (const win of ["perMinute", "perHour", "perDay"] as const) {
        const limit = endpointCfg.perUser[win];
        if (!limit) continue;
        const r = await checkAndIncrement({
            scope: "user",
            identifier: userId,
            endpoint: `${ctx.endpoint}#${win}`,
            limit,
            windowMs: RATE_WINDOWS[win],
        });
        if (r.limited) return { scope: "user_endpoint", result: r };
    }
}
return null;

function applyRateHeaders(res: VercelResponse, hit: RateLimitHit): void {
    res.setHeader("X-RateLimit-Limit", String(hit.result.limit));
    res.setHeader("X-RateLimit-Remaining", String(hit.result.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(hit.result.resetAt.getTime() / 1000)));
    if (hit.result.retryAfter) res.setHeader("Retry-After", String(hit.result.retryAfter));
}

// 'THREAT_SCORE_ADJUSTMENTS' import is used implicitly by IP-intel; re-exporting
// it keeps tree-shaking honest and gives test files a single import surface.
export { THREAT_SCORE_ADJUSTMENTS };