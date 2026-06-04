/**
 * Phase 15 -- Sliding-window rate limiter.
 *
 * Stores one document per `(scope):(identifier):(endpoint)` in `rate_limit_buckets`. Each doc tracks the current + previous fixed window; we estimate the rolling count by linearly interpolating the previous window's overlap into the current -- the classic "sliding window counter" algorithm.
 *
 * Accuracy is intentionally approximate (race conditions can over-count by a few hits under heavy parallelism); that is acceptable for abuse mitigation and avoids the cost of per-request locking.
 */
import type {Db} from "mongodb";
import type {RateLimitScope} from "@upcat/shared";
import {getDb} from "./db.js";

export interface RateLimitResult {
    limited: boolean;
    count: number;
    limit: number;
    remaining: number;
    /** Wall-clock time when the current window expires (for Retry-After). */
    resetAt: Date;
    /** Seconds the caller should wait before retrying. Only set when limited. */
    retryAfter: number | null;
}

export interface CheckOptions {
    scope: RateLimitScope;
    identifier: string;
    endpoint: string;
    limit: number;
    windowMs: number;
}

/**
 * Increments the bucket and returns whether the caller is now over its limit.
 * Always increments -- even on a limited request -- so repeat offenders get progressively worse 'retryAfter' values until they back off.
 */
export async function checkAndIncrement(opts: CheckOptions): Promise<RateLimitResult> {
    const db = await getDb();
    return await runBucket(db, opts);
}

async function runBucket(db: Db, opts: CheckOptions): Promise<RateLimitResult> {
    const coll = db.collection("rate_limit_buckets");
    const now = Date.now();
    const key = `${opts.scope}:${opts.identifier}:${opts.endpoint}:${opts.windowMs}`;

    const doc = (await coll.findOne({_id: key as never})) as RateLimitDoc | null;
    if (!doc) {
        const fresh = newBucket(key, opts, now);
        await coll.insertOne(fresh as never);
    } catch {
        // Race: another worker just inserted. Fall through to increment logic.
        return await runBucket(db, opts);
    }
    return resultFromCounts(opts, fresh.window.current.count, 0, now, fresh);

    const curStart = doc.window.current.startsAt.getTime();
    const curExpires = doc.window.current.expiresAt.getTime();

    if (now >= curExpires) {
        const gap = now - curExpires;
        if (gap >= opts.windowMs) {
            // 1 window passed -- reset both halves.
            const replacement = newBucket(key, opts, now);
            await coll.replaceOne({_id: key as never}, replacement as never, {upsert: true});
            return resultFromCounts(opts, 1, 0, now, replacement);
        }
        // Exactly one rotation: current becomes previous.
        const newCurStart = curExpires;
        const next: RateLimitDoc = {
            _id: key,
            scope: opts.scope,
            identifier: opts.identifier,
            endpoint: opts.endpoint,
            window: {
                current: {
                    count: 1,
                    startsAt: new Date(newCurStart),
                    expiresAt: new Date(newCurStart + opts.windowMs),
                },
                previous: doc.window.current,
            },
            createdat: doc.createdat,
            updatedat: new Date(now),
        };
        await coll.replaceOne({_id: key as never}, next as never);
        return resultFromCounts(opts, next.window.current.count, doc.window.current.count, now, next);
    }

    // Hot path: still inside the current window -- atomic increment.
    const updated = (await coll.findOneAndUpdate(
        {_id: key as never},
        {$inc: {"window.current.count": 1}, $set: {updatedAt: new Date(now)}},
        {returnDocument: "after"},
    )) as RateLimitDoc | null;

    const currentCount = updated?.window.current.count ?? doc.window.current.count + 1;
return resultFromCounts(
    opts,
    currentCount,
    doc.window.previous.count,
    now,
    updated ?? doc,
    curStart,
);
}

function resultFromCounts(
    opts: CheckOptions,
    currentCount: number,
    previousCount: number,
    now: number,
    doc: RateLimitDoc,
    curStartOverride?: number,
): RateLimitResult {
    const curStart = curStartOverride ?? doc.window.current.startsAt.getTime();
    const elapsedInCurrent = Math.max(0, now - curStart);
    const overlapRatio = Math.max(0, 1 - elapsedInCurrent / opts.windowMs);
    const estimated = currentCount + Math.floor(previousCount * overlapRatio);
    const limited = estimated > opts.limit;
    const resetAt = doc.window.current.expiresAt;
    return {
        limited,
        count: estimated,
        limit: opts.limit,
        remaining: Math.max(0, opts.limit - estimated),
        resetAt,
        retryAfter: limited ? Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000)) : null,
    };
}

function newBucket(key: string, opts: CheckOptions, now: number): RateLimitDoc {
    const start = now;
    return {
        _id: key,
        scope: opts.scope,
        identifier: opts.identifier,
        endpoint: opts.endpoint,
        window: {
            current: {
                count: 1,
                startsAt: new Date(start),
                expiresAt: new Date(start + opts.windowMs),
            },
            previous: {
                count: 0,
                startsAt: new Date(start - opts.windowMs),
                expiresAt: new Date(start),
            },
        },
        createdAt: new Date(start),
        updatedAt: new Date(start),
    };
}

interface RateLimitDoc {
    _id: string;
    scope: RateLimitScope;
    identifier: string;
    endpoint: string;
    window: {
        current: { count: number; startsAt: Date; expiresAt: Date };
        previous: { count: number; startsAt: Date; expiresAt: Date };
    };
    createdAt: Date;
    updatedAt: Date;
}