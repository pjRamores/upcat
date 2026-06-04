/**
 * Cron: deactivate expired blocked entities + clean stale sessions.
 * Schedule: every 15 minutes. ('*/15 * * * *')
 *
 * - blocked_entities: rows whose 'expiresAt' < now and 'isActive': true
 * are flipped to 'isActive': false. Cache is invalidated.
 * - user_sessions: rows whose 'expiresAt' < now are deleted outright
 * (TTL index does the same, but we want bounded latency for security UI).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDB } from "../src/db.js";
import { requireCronAuth } from "../src/cronAuth.js";
import { invalidateBlockedCache } from "../src/security/blockedEntities.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;
    const db = await getDB();
    const now = new Date();

    const blocks = await db
        .collection("blocked_entities")
        .updateMany(
            { isActive: true, expiresAt: {$ne: null, $lt: now} },
            {$set: {isActive: false}},
        );
    if (blocks.modifiedCount > 0) invalidateBlockedCache();

    const sessions = await db
        .collection("user_sessions")
        .deleteMany({expiresAt: {$lt: now}});

    // Also delete CAPTCHA challenges past TTL (TTL index does this too,
    // but explicit cleanup keeps the collection tight under load).
    const captchas = await db
        .collection("captcha_challenges")
        .deleteMany({expiresAt: {$lt: now}});

    res.status(200).json({
        success: true,
        data: {
            blocksExpired: blocks.modifiedCount,
            sessionsCleaned: sessions.deletedCount,
            captchasCleaned: captchas.deletedCount,
        },
    });
}