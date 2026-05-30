/**
 * Shared HTTP security helpers used by every Vercel/Lambda function.
 *
 * Responsibilities
 * Apply hardened response headers (CSP, HSTS, X-Frame-Options, ...).
 * Restrict CORS to the configured frontend origin.
 * Provide a tiny MongoDB-backed sliding-window rate limiter.
 * Sanitize free-form text input.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "./db.js";

/* -------------------------------------------------------------------------
 * Security headers
 * ------------------------------------------------------------------------- */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // API responses are pure JSON. CSP is set conservatively here; the
  // frontend ships its own CSP via the CDN/host config.
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

export function applySecurityHeaders(res: VercelResponse): void {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
}

/* -------------------------------------------------------------------------
 * CORS
 * ------------------------------------------------------------------------- */

function allowedOrigins(): string[] {
  const list = [process.env.FRONTEND_URL, process.env.APP_URL]
    .filter((s): s is string => !!s)
    .map((s): => s.replace(/\/$/, ""));
  // Localhost is allowed in development only.
  if (process.env.NODE_ENV !== "production") {
    list.push("http://localhost:5173", "http://127.0.0.1:5173");
  }
  return Array.from(new Set(list));
}

/**
 * Sets CORS + security headers and short-circuits OPTIONS preflight.
 * Returns `true` if the request has already been handled (caller must
 * stop processing immediately).
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  applySecurityHeaders(res);
  const origin = (req.headers.origin ?? "").toString();
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

/* -------------------------------------------------------------------------
 * Rate limiting (MongoDB sliding window)
 * ------------------------------------------------------------------------- */

export interface RateLimitOptions {
  /** Identifier -- usually the route name. */
  key: string;
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Scope: per-IP, per-user, or both. */
  scope: "ip" | "user" | "ip+user";
}

function clientIp(req: VercelRequest): string {
  const fwd = (req.headers["x-forwarded-for"] as string) | undefined;
  return fwd.split(",")[0].trim() || (req.socket?.remoteAddress ?? "unknown");
}

/**
 * Sliding-window rate limiter. Returns `true` when the request has
 * been rejected (429 already sent) and `false` when it may proceed.
 *
 * The implementation uses a single MongoDB document per (key, subject)
 * with a TTL index so old buckets are evicted automatically.
 */
export async function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  opts: RateLimitOptions,
  userId?: string,
) : Promise<boolean> {
  const parts: string[] = [opts.key];
if (opts.scope === "ip" || opts.scope === "ip+user") parts.push(`ip:${clientIp(req)}`);
if ((opts.scope === "user" || opts.scope === "ip+user") && userId) {
  parts.push(`u:${userId}`);
}
const subject = parts.join("|");
const now = Date.now();
const windowStart = now - opts.windowMs;

const db = await getDb();
const col = db.collection("rate_limits");

// Append this hit; drop hits older than the window. The MongoDB
// Node-driver types don't model `$push` + `$each` + `$slice` cleanly
// against an untyped collection, so we cast the update document.
const update = {
  $push: {hits: {$each: [now], $slice: -opts.limit * 2}},
  $set: {expiresAt: new Date(now + opts.windowMs * 2)},
} as unknown as Parameters<typeof col.updateOne>[1];
await col.updateOne({_id: subject as unknown as never}, update, {upsert: true});
const doc = await col.findOne<{hits?: number[]}>({_id: subject as unknown as never});
const recent = (doc?.hits ?? []).filter((t) => t > windowStart);

if (recent.length > opts.limit) {
  const retryAfter = Math.ceil((recent[0]! + opts.windowMs - now) / 1000);
  res.setHeader("Retry-After", String(Math.max(retryAfter, 1)));
  res.setHeader("X-RateLimit-Limit", String(opts.limit));
  res.setHeader("X-RateLimit-Remaining", "0");
  res.status(429).json({error: "Too many requests. Please slow down."});
  return true;
}
res.setHeader("X-RateLimit-Limit", String(opts.limit));
res.setHeader("X-RateLimit-Remaining", String(Math.max(0, opts.limit - recent.length)));
return false;
}

/** Pre-baked rate-limit policies -- apply with `await` rateLimit(req, res, POLICY, ...) `.*` */
export const RATE_LIMITS = {
  AUTH: {limit: 5, windowMs: 60_000, scope: "ip" as const},
  EXAM: {limit: 30, windowMs: 60_000, scope: "ip+user" as const},
  CONTACT: {limit: 3, windowMs: 60 * 60_000, scope: "ip" as const},
  STATS: {limit: 60, windowMs: 60_000, scope: "user" as const},
};

/* -------------------------------------------------------------------------
 * Input sanitization
 * ------------------------------------------------------------------------- */

/** Strip HTML tags and dangerous control characters from free-form text. */
export function sanitizeText(input: unknown, maxLen = 2000): string {
  if (typeof input !== "string") return "";
  return input
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  .replace(/<[^>]*>/g, "")
  .trim()
  .slice(0, maxLen);
}

/** Basic RFC-5322-ish email validator. Use before any DB lookup. */
export function isEmail(s: unknown): s is string {
  return (
    typeof s === "string" &&
    s.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
  );
}