/**
 * Phase 15 — Input sanitization.
 *
 * Defense-in-depth checks applied to every request body/query before the
 * handler sees it. Catches:
 * ... NoSQL injection (operator-valued objects in scalar fields)
 * ... Prototype pollution (__proto__, constructor, prototype keys)
 * ... XSS payloads in string fields
 * ... Excessively deep / large objects
 * ... Null bytes & path traversal
 *
 * `inspectPayload()` is non-mutating and returns a structured list of
 * threats; `sanitizePayload()` returns a cleaned clone safe for handlers.
 */
export type Threat =
  | "nosql_injection"
  | "proto_pollution"
  | "xss_attempt"
  | "depth_exceeded"
  | "null_byte"
  | "path_traversal";

export interface InspectResult {
  threats: Threat[];
  /** Field paths where each threat was found, in encounter order. */
  paths: Array<{ threat: Threat; path: string }>;
}

const MAX_DEPTH = 6;
const FORBIDDEN_KEYS = new Set([ "__proto__", "constructor", "prototype"]);
const MONGO_OPERATOR = /^\$[a-zA-Z]/;
const SCRIPT_TAG = /<\s*script\b[^>]*>|<\s*\/\s*script\s*>/i;
const ON_HANDLER = /\bon[a-z]+\s*=/i;
const JS_URI = /javascript\s*:/i;
const NULL_BYTE = /\u0000/;
const PATH_TRAVERSAL = /(\.\.[/\\]){2,}|^\.\.[/\\]/;

export function inspectPayload(value: unknown): InspectResult {
  const out: InspectResult = {threats: [], paths: []};
  walk(value, "$", 0, out);
  return out;
}

function walk(value: unknown, path: string, depth: number, out: InspectResult): void {
  if (depth > MAX_DEPTH) {
    push(out, "depth_exceeded", path);
    return;
  }
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (NULL_BYTE.test(value)) push(out, "null_byte", path);
    if (PATH_TRAVERSAL.test(value)) push(out, "path_traversal", path);
    if (SCRIPT_TAG.test(value) || ON_HANDLER.test(value) || JS_URI.test(value)) {
      push(out, "xss_attempt", path);
    }
    return;
  }
  if (typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) walk(value[i], `${path}[${i}]`, depth + 1, out);
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(k)) push(out, "proto_pollution", `${path}.${k}`);
    if (MONGO_OPERATOR.test(k)) push(out, "nosql_injection", `${path}.${k}`);
    walk(obj[k], `${path}.${k}`, depth + 1, out);
  }
}

function push(out: InspectResult, threat: Threat, path: string): void {
  if (!out.threats.includes(threat)) out.threats.push(threat);
  out.paths.push({threat, path});
}

/**
 * Returns a sanitized deep clone:
 * Removes forbidden keys outright.
 * Strips Mongo-operator keys.
 * Truncates strings to 10_000 chars (overlong content is suspicious).
 * Removes <script>, on*= attributes, javascript: URIs from strings.
 */

export function sanitizePayload<T>(value: T): T {
  return clean(value, 0) as T;
}

function clean(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return cleanString(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (MONGO_OPERATOR.test(k)) continue;
    const c = clean(src[k], depth + 1);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

function cleanString(s: string): string {
let v = s.length > 10_000 ? s.slice(0, 10_000) : s;
v = v.replace(/\u0000/g, "");
v = v.replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
v = v.replace(/<\s*script\b[^>]*>/gi, "");
v = v.replace(/\bon[a-z]+\s*=\s*'[^']*'/gi, "");
v = v.replace(/\bon[a-z]+\s*=\s*'[^']*'/gi, "");
v = v.replace(/javascript\s*:/gi, "");
return v;
}