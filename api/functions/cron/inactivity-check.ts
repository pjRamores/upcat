/**
 * Cron: inactivity check.
 * Schedule: 0 4 * * 1 (weekly, Monday 04:00 UTC)
 *
 * - Sends a friendly reminder email to users who have not logged in
 *   for INACTIVITY_REMINDER_DAYS (365). Marked via `security.inactivityReminderSentAt`.
 * - Flags accounts that have not logged in for INACTIVITY_FLAG_DAYS (730)
 *   via `security.inactivityFlaggedAt` (for admin review, no auto-delete).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireCronAuth} from "../../src/cronAuth.js";
import {sendInactivityReminderEmail} from "../../src/email.js";
import {INACTIVITY_FLAG_DAYS, INACTIVITY_REMINDER_DAYS} from "../../../../shared/src/constants.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;
    const db = await getDb();
    const now = Date.now();
    const reminderCutoff = new Date(now - INACTIVITY_REMINDER_DAYS * 86400 * 1000);
    const flagCutoff = new Date(now - INACTIVITY_FLAG_DAYS * 86400 * 1000);

    // Reminder pass
    const remindCandidates = await db.collection("users")
        .find({
            isDeleted: {$ne: true},
            lastLoginAt: {$lt: reminderCutoff},
            $or: [
                {"security.inactivityReminderSentAt": {$exists: false}},
                {"security.inactivityReminderSentAt": null},
            ]
        })
        .limit(200)
        .toArray();

    let reminded = 0;
    for (const u of remindCandidates) {
        if (!u.email) continue;
        try {
            await sendInactivityReminderEmail(u.email);
            await db.collection("users").updateOne(
                {_id: u._id},
                {
                    $set: {
                        "security.inactivityReminderSentAt": new Date(),
                        updatedAt: new Date(),
                    },
                }
            );
            reminded += 1;
        } catch {
            /* keep going */
        }
    }

    // Flag pass
    const flagResult = await db.collection("users").updateMany(
        {
            isDeleted: {$ne: true},
            lastLoginAt: {$lt: flagCutoff},
            $or: [
                {"security.inactivityFlaggedAt": {$exists: false}},
                {"security.inactivityFlaggedAt": null},
            ],
        },
        {
            $set: {
                "security.inactivityFlaggedAt": new Date(),
                updatedAt: new Date(),
            },
        }
    );

    return res.status(200).json({
        success: true,
        data: {
            reminded,
            remindedScanned: remindCandidates.length,
            flagged: flagResult.modifiedCount,
        },
    });
}