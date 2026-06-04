/**
 * Cron: execute pending deletion requests.
 * Schedule (Vercel.cron): 0 * * * * * (hourly)
 * Picks deletion requests that are processing (confirmed) and whose scheduledFor has passed, then runs the full deletion executor.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../src/db.js";
import {requireCronAuth} from "../src/cronAuth.js";
import {executeDeletion} from "../src/dataRequests.js";
import {sendDeletionExecutedEmail} from "../src/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;
    const db = await getDb();
    const due = await db
        .collection("data_requests")
        .find({
            type: "deletion",
            status: "processing",
            "deletion.confirmedAt": {$ne: null},
            "deletion.executedAt": null,
            "deletion.scheduledFor": {$lte: new Date()},
        })
        .limit(50)
        .toArray();

    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const doc of due) {
        try {
            const owner = await db.collection("users").findOne({_id: doc.userId});
            const ownerEmail = owner?.email as string | undefined;
            await executeDeletion({
                db,
                userId: doc.userId,
                scope: doc.deletion.scope,
                retainAnonymizedStats: !doc.deletion.retainAnonymizedStats,
                deletionType: "user_requested",
                dataRequestId: doc._id,
            });
            await db.collection("data_requests").updateOne(
                {_id: doc._id},
                {
                    $set: {
                        status: "completed",
                        updatedAt: new Date(),
                        "deletion.executedAt": new Date(),
                    },
                },
            );
            if (ownerEmail) {
                sendDeletionExecutedEmail(ownerEmail).catch(() => undefined);
            }
            results.push({id: doc._id.toString(), ok: true});
        } catch (err) {
            await db.collection("data_requests").updateOne(
                {_id: doc._id},
                {
                    $set: {
                        status: "failed",
                        updatedAt: new Date(),
                        failureReason: (err as Error)?.message ?? "unknown",
                    },
                },
            );
            results.push({
                id: doc._id.toString(),
                ok: false,
                error: (err as Error)?.message,
            });
        }
    }
    return res.status(200).json({
        success: true,
        data: {processed: results.length, results},
    });
}