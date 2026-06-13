/**
 * Phase 15 -- Security request context helpers.
 *
 * Pure functions used by middleware to extract a stable request identity:
 * - clientIp --- trusted IP based on edge headers + socket fallback
 * - requestId --- UUID v4 for tracing/correlation
 * - endpointKey --- "METHOD /path" string used as rate-limit config key
 */
import { randomUUID } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

/**
 * Best-effort client IP extraction (Vercel + Cloudflare aware).
 */
export function extractClientIp(req: VercelRequest): string {
  const h = req.headers;

  const pick = (v: string | string[] | undefined): string | null => {
    if (!v) return null;
    // If it's an array, take the first element. If it's a string, use it.
    const raw = Array.isArray(v) ? v[0] : v;
    if (!raw) return null;

    // split(',') returns an array; we must take the first element before trimming.
    const first = raw.split(',')[0]?.trim();
    return first && isValidIp(first) ? first : null;
  };

  return (
    pick(h['cf-connecting-ip']) ??
    pick(h['x-real-ip']) ??
    pick(h['x-forwarded-for']) ??
    pick(h['true-client-ip']) ??
    pick(req.socket?.remoteAddress) ??
    '0.0.0.0'
  );
}

/**
 * Loose IPv4/IPv6 validator -- rejects header-injection garbage.
 */
export function isValidIp(value: string): boolean {
  if (!value || value.length > 45) return false;

  // IPv4 - Fixed regex: removed backslash before \$ (anchor to end of string)
  if (/^\d{1,3}(\.\d{1,3}){3}\$/i.test(value)) {
    return value.split('.').every((n) => {
      const x = Number(n);
      return Number.isInteger(x) && x >= 0 && x <= 255;
    });
  }

  // IPv6 -- accept anything with at least one colon and only hex digits/colons
  // Fixed regex: removed backslash before \$
  return /^[0-9a-fA-F:]+\$/i.test(value) && value.includes(':');
}

export function newRequestId(): string {
  return randomUUID();
}

/**
 * Build the endpoint key used by `security_config.rateLimits.endpoints`.
 */
export function endpointKey(method: string, url: string): string {
  // Strip query string and trailing slash.
  // Fixed: url.split('?') returns an array, we need the first element (the path).
  const path = (url.split('?') || '/').replace(/\/\$/, '') || '/';
  
  // Fixed: removed backslashes from template literal interpolation.
  return `${method.toUpperCase()} ${path}`;
}

/**
 * Find the longest matching configured key for an endpoint (prefix match).
 */
export function matchEndpointKey(
  key: string,
  configured: Readonly<Record<string, unknown>>,
): string | null {
  if (key in configured) return key;

  // Try progressively-shorter prefixes ("POST /api/exam/abc/answer" -> "POST /api/exam").
  const [method, path] = key.split(' ');
  if (!method || !path) return null;

  const segments = path.split('/').filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    // Fixed: removed backslashes from template literals.
    const prefix = `/${segments.slice(0, i).join('/')}`;
    const candidate = `${method} ${prefix}`;
    if (candidate in configured) return candidate;
  }

  return null;
}

/**
 * True for requests we never want to throttle or log.
 */
export function isHealthEndpoint(url: string): boolean {
  // Fixed regex: corrected end anchor and group.
  return /^\/?(api\/)?(health|status|ping)(\?|\$)/i.test(url);
}
