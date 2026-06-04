/**
 * In-memory sliding-window rate limiter keyed by IP + bucket name.
 *
 * Survives across warm serverless invocations on the same instance and resets on cold starts. Good enough to protect the social-login endpoints from naive abuse; a real distributed limiter (Redis/Upstash) can replace this without changing call sites.
 */
import type { VercelRequest } from "@vercel/node";

interface Bucket {
    hits: number[];
}

const STORE = new Map<string, Bucket>();

export function clientIp(req: VercelRequest): string {
    const fwd = req.headers["x-forwarded-for"];
    if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
    if (Array.isArray(fwd) && fwd[0]) return fwd[0]!.split(",")[0]!.trim();
    const real = req.headers["x-real-ip"];
    if (typeof real === "string" && real) return real;
    return req.socket?.remoteAddress ?? "unknown";
}

export function rateLimit(args: {
    bucket: string;
    key: string;
    limit: number;
    windowMs: number;
}): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    const cutoff = now - args.windowMs;
    const fullKey = `${args.bucket}:${args.key}`;
    const b = STORE.get(fullKey) ?? { hits: [] };
    b.hits = b.hits.filter((t) => t > cutoff);
    if (b.hits.length >= args.limit) {
        const oldest = b.hits[0]!;
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + args.windowMs - now) / 1000)) };
    }
    b.hits.push(now);
    STORE.set(fullKey, b);
    // Opportunistic GC: every ~256 inserts, prune cold entries.
    if (Math.random() < 1 / 256) {
        for (const [k, v] of STORE) {
            if (v.hits.length === 0 || v.hits[v.hits.length - 1]! < cutoff) STORE.delete(k);
        }
    }
    return { allowed: true, retryAfterSec: 0 };
}