/**
 * Phase 15 - Security HTTP headers & CORS.
 *
 * Two helpers:
 * applySecurityHeaders(res, cfg) - sets HSTS/CSP/X-Frame-Options/etc.
 * applyCors(req, res, opts) -- strict CORS preflight handling.
 * Returns "preflight-handled" when an OPTIONS request was answered
 * in full (caller should return immediately), "ok" otherwise.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SecurityConfig } from "@upcat/shared";

export function applySecurityHeaders(
  res: VercelResponse,
  cfg: SecurityConfig,
): void {
  const h = cfg.headers;

  if (h.hsts.enabled) {
    let v = `max-age=\${h.hsts.maxAge}`;
    if (h.hsts.includeSubDomains) v += "; includeSubDomains";
    res.setHeader("Strict-Transport-Security", v);
  }

  res.setHeader("Content-Security-Policy", buildCsp(h.csp));
  res.setHeader("X-Frame-Options", h.xFrameOptions);
  res.setHeader("X-Content-Type-Options", h.xContentTypeOptions);
  res.setHeader("Referrer-Policy", h.referrerPolicy);
  res.setHeader("Permissions-Policy", h.permissionsPolicy);
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
}

export function buildCsp(csp: SecurityConfig["headers"]["csp"]): string {
  const directives: string[] = [];

  const add = (name: string, vals: readonly string[] | undefined) => {
    if (!vals || vals.length === 0) return;
    directives.push(`\${name} \${vals.join(" ")}`);
  };

  add("default-src", csp.defaultSrc);
  add("script-src", csp.scriptSrc);
  add("style-src", csp.styleSrc);
  add("img-src", csp.imgSrc);
  add("connect-src", csp.connectSrc);
  add("font-src", csp.fontSrc);
  add("frame-src", csp.frameSrc);
  add("object-src", csp.objectSrc);
  add("base-uri", csp.baseUri);
  directives.push("form-action 'self'");
  directives.push("frame-ancestors 'none'");

  return directives.join("; ");
}

export interface CorsOptions {
  allowedOrigins: string[];
}

export type CorsResult = "ok" | "preflight-handled" | "blocked";

export function applyCors(
  req: VercelRequest,
  res: VercelResponse,
  opts: CorsOptions,
): CorsResult {
  const rawOrigin = req.headers.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin : rawOrigin;

  if (!origin) {
    // Same-origin / non-browser request -- no CORS headers needed.
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return "preflight-handled";
    }
    return "ok";
  }

  const normalizedOrigin = origin.trim().replace(/\/\$/, "");
  const allowed = opts.allowedOrigins.includes(normalizedOrigin);

  if (!allowed) {
    if (req.method === "OPTIONS") {
      res.status(403).end();
      return "blocked";
    }
    return "blocked";
  }

  res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-Id, X-Device-Fingerprint, X-Captcha-Token",
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return "preflight-handled";
  }

  return "ok";
}

/** Parse FRONTEND_URL (comma-separated permitted) into the origin list. */
export function getAllowedOrigins(): string[] {
  const env = process.env.FRONTEND_URL || process.env.PUBLIC_URL || "";

  const list = env
    .split(",")
    .map((s) => s.trim().replace(/\/\$/, ""))
    .filter((s): s is string => Boolean(s));

  if (list.length === 0) {
    // Sensible local-dev default.
    list.push("http://localhost:5173");
  }

  return list;
}
