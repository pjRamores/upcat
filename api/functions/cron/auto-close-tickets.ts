/**
 * Cron: auto-close stale support tickets.
 * Schedule: 0 3 * * * (daily at 03:00 UTC)
 *
 * Closes tickets in status "awaiting_user" whose last message is older than SUPPORT_AUTO_CLOSE_DAYS and posts a system message explaining the auto-close.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../src/db.js";
import {requireCronAuth} from "../src/cronAuth.js";
import {systemMessage} from "../src/support.js";
import {SUPPORT_AUTO_CLOSE_DAYS} from "../../../../shared/src/constants.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;
    const db = await getDb();
    const cutoff = new Date(Date.now() - SUPPORT_AUTO_CLOSE_DAYS * 86400 * 1000);

    const stale = await db
        .collection("support_tickets")
        .find({
            status: "awaiting_user",
            $or: [
                {lastMessageAt: {$lt: cutoff}},
                {lastMessageAt: {$exists: false}, updatedAt: {$lt: cutoff}},
            ]
        })
        .limit(200)
        .toArray();

    let closed = 0;
    for (const ticket of stale) {
        const msg = systemMessage(
            `Ticket auto-closed after ${SUPPORT_AUTO_CLOSE_DAYS} days of inactivity. Reply to reopen.`,
        );
        await db.collection("support_tickets").updateOne(
            {_id: ticket._id},
            {
                $set: {
                    status: "closed",
                    updatedAt: new Date(),
                    closedAt: new Date(),
                    "resolution.reason": "auto_closed_inactivity",
                    "resolution.closedAt": new Date(),
                },
                $push: {messages: msg} as never,
            },
        );
        closed += 1;
    }
    return res.status(200).json({
        success: true,
        data: {closed, scanned: stale.length},
    });
}