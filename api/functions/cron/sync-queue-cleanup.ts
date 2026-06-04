import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../src/db.js";
import { requireCronAuth } from "../../src/cronAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;

    const db = await getDb();
    const now = new Date();
    const queueRetentionDays = Math.max(1, Number(process.env.SYNC_QUEUE_CLEANUP_RETENTION_DAYS || "14"));
    const recoveryRetentionDays = Math.max(1, Number(process.env.SESSION_RECOVERY_CLEANUP_RETENTION_DAYS || "3"));

    const queueCutoff = new Date(now.getTime() - queueRetentionDays * 24 * 60 * 60 * 1000);
    const recoveryCutoff = new Date(now.getTime() - recoveryRetentionDays * 24 * 60 * 60 * 1000);

    const [expiredQueue, staleQueue, staleRecovery] = await Promise.all([
        db.collection("sync_queue").deleteMany({ expiresAt: {$lte: now} }),
        db.collection("sync_queue").deleteMany({
            status: {$in: ["completed", "failed", "conflict"]},
            processedAt: {$lte: queueCutoff},
        }),
        db.collection("session_recovery").deleteMany({
            $or: [
                { expiresAt: {$lte: now}},
                { status: {$in: ["recovered", "completed", "failed"]}, updatedAt: {$lte: recoveryCutoff}},
            ],
        }),
    ]);

    return res.status(200).json({
        success: true,
        data: {
            expiredQueueDeleted: expiredQueue.deletedCount,
            staleQueueDeleted: staleQueue.deletedCount,
            staleRecoveryDeleted: staleRecovery.deletedCount,
            queueRetentionDays,
            recoveryRetentionDays,
        },
    });
}