import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireCronAuth } from "../../src/cronAuth.js";
import { getDB } from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;

    const db = await getDB();
    const now = new Date();
    const pending = await db
        .collection("payment_submissions")
        .find({ status: "pending", expiresAt: {$lte: now} })
        .toArray();

    let expired = 0;
    for (const submission of pending) {
        await db.collection("payment_submissions").updateOne(
            {_id: submission._id},
            {
                $set: {
                    status: "expired",
                    "review.rejectionReason": "Submission expired",
                    updatedAt: new Date(),
                },
            },
        );
        expired += 1;
    }

    return res.status(200).json({success: true, data: {scanned: pending.length, expired}});
}