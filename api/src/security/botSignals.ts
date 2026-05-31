/**
 * Phase 15b — Bot detection signal helpers.
 *
 * Pure utility helpers that handlers (or `withSecurity` extensions) can
 * call to score bot risk. Each helper returns a structured result that
 * the caller can act on — these helpers don't write to the database or
 * issue responses themselves.
 *
 * Includes:
 *   analyzeHeaders() — header presence + UA consistency
 *   issueTimingToken() // verifyTimingToken() — HMAC-signed form load
 *   timestamps used to detect "submitted in" < 2s after load" bots
 *   checkHoneypot() — true if the hidden field was filled
 *   requireCaptcha() — gates a handler on a valid X-Captcha-Token,
 *   auto-generating a fresh challenge URL when missing
 */
import {createHmac, timingSafeEqual} from "node:crypto";
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {extractCaptchaToken} from "./captcha.js";

const SECRET = process.env.JWT_SECRET || "dev-secret";
const TIMING_DEFAULT_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

// — Header analysis —

export interface HeaderAnalysis {
  signals: string[];
  /** Suggested threat-score delta (0 = clean, higher = worse). */
  scoreHint: number;
}

const REQUIRED_BROWSER_HEADERS = ["accept", "accept-language", "accept-encoding"];

/**
 * Pure inspection. We never block on UA alone, but missing or impossible
 * combinations push the score upward.
 */
export function analyzeHeaders(req: VercelRequest): HeaderAnalysis {
  const signals: string[] = [];
  const h = req.headers;
  const ua = String(h["user-agent"] ?? "");

  if (!ua.trim()) {
    signals.push("missing_user_agent");
  }
  for (const name of REQUIRED_BROWSER_HEADERS) {
    if (!h[name]) signals.push(`missing_${name.replace(/-/g, "_")}`);
  }
  // Very short or obviously-fake UAs.
  if (ua.length > 0 && ua.length < 16) signals.push("short_user_agent");
  if (/^(curl|wget|python-requests|go-http-client|httpclient|axios|node-fetch)/i.test(ua)) {
    signals.push("cli_user_agent");
  }
  // Chrome UA claiming a version that hasn't existed (capped at 200 for now).
  const m = /Chrome\/(\d+)/.exec(ua);
  if (m) {
    const v = Number(m[1]);
    if (v < 50 || v > 200) signals.push("impossible_chrome_version");
  }
  // Conflicting platform claims.
  if (/Windows/i.test(ua) && /Macintosh/i.test(ua)) {
    signals.push("conflicting_platform");
  }

  const scoreHint =
    signals.length === 0
    ? 0
    : signals.includes("cli_user_agent") || signals.includes("missing_user_agent")
    ? 15
    : signals.length >= 2
    ? 10
    : 5;
  return {signals, scoreHint};
}

// — Timing tokens —

/**
 * Returns an opaque token encoding (issuedAt, purpose). Embed in form
 * markup or HTML response; client echoes it on submit so we can verify
 * minimum-time-since-render.
 *
 * Format: base64url(payload) + "." + base64url(hmac)
 */
export function issueTimingToken(purpose: string): string {
  const payload = `${Date.now()}.${purpose}`;
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export interface TimingVerification {
  valid: boolean;
  elapsedMs: number;
  /** True if elapsed was below the configured minimum (likely bot). */
  tooFast: boolean;
  /** True if the token is past maxAgeMs and should be reissued. */
  expired: boolean;
}
if (!token) return {valid: false, elapsedMs: 0, tooFast: false, expired: false};
const parts = token.split(".");
if (parts.length !== 2) return {valid: false, elapsedMs: 0, tooFast: false, expired: false};
const [b64, sig] = parts as [string, string];
const expected = createHmac("sha256", SECRET).update(b64).digest("base64url");
if (!safeEqual(sig, expected)) {
  return {valid: false, elapsedMs: 0, tooFast: false, expired: false};
}
let issuedAt = 0;
let purpose = "";
try {
  const decoded = Buffer.from(b64, "base64url").toString("utf8");
  const [tsStr, ...rest] = decoded.split(".");
  issuedAt = Number(tsStr);
  purpose = rest.join(".");
} catch {
  return {valid: false, elapsedMs: 0, tooFast: false, expired: false};
}
if (!Number.isFinite(issuedAt) || purpose !== opts.purpose) {
  return {valid: false, elapsedMs: 0, tooFast: false, expired: false};
}
const now = Date.now();
const elapsed = now - issuedAt;
const maxAge = opts.maxAgeMs ?? TIMING_DEFAULT_MAX_AGE_MS;
if (elapsed > maxAge) {
  return {valid: true, elapsedMs: elapsed, tooFast: false, expired: true};
}
return {
  valid: true,
  elapsedMs: elapsed,
  tooFast: elapsed < opts.minMs,
  expired: false,
};
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// --- Honeypot ---

/**
 * Returns true when any of the honeypot field names is non-empty in the
 * body. Common field names: "website", "phone2", "company_url".
 */
export function checkHoneypot(
  body: Record<string, unknown> | null | undefined,
  fields: string[] = ["website", "phone2", "company_url"],
) : boolean {
  if (!body || typeof body !== "object") return false;
  for (const f of fields) {
    const v = (body as Record<string, unknown>)[f];
    if (typeof v === "string" && v.trim().length > 0) return true;
    if (typeof v === "number" || typeof v === "boolean") return true;
  }
  return false;
}

// --- CAPTCHA gate ---

/**
 * Synchronous gate. Returns true and writes a 428 response when the
 * required CAPTCHA token is missing or invalid. Handler must `return`
 * when this returns true.
 */
export function requireCaptcha(req: VercelRequest, res: VercelResponse): boolean {
  const token = extractCaptchaToken(req.headers);
  if (token) return false;
  res
    .status(428)
    .json({
      success: false,
      error: "CAPTCHA required.",
      code: "captcha_required",
    });
  return true;
}