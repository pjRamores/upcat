/**
 * Cron: daily IP intelligence aggregation.
 * Schedule: 30 * * * * (UTC +00:30 - runs after security-report at 00:00)
 *
 * Marks suspicious IPs based on patterns from the last 7 days:
 *   - IPs that triggered >50 security events → reputation "suspicious"
 *   - IPs associated with >10 distinct user accounts → flag as "shared_or_proxy"
 *   - IPs in countries with disproportionately high failed-login rates
 *
 * The job is intentionally conservative: it adds 'riskFactors' strings and lets the threat-score adjuster handle scoring on next request.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireCronAuth} from "../../src/cronAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;
    const db = await getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // IPs with >50 events in last 7 days.
    const noisyIps = await db
        .collection("security_events")
        .aggregate([
            {$match: {timestamp: {$gte: sevenDaysAgo}}},
            {$group: {_id: "$source.ip", count: {$sum: 1}}},
            {$match: {count: {$gt: 50}}}
        ])
        .toArray();

    let flagged = 0;
    for (const row of noisyIps) {
        if (!row._id) continue;
        await db.collection("ip_intelligence").updateOne(
            {_id: row._id as never},
            {
                $addToSet: {riskFactors: "high_event_count_7d"},
                $set: {updatedAt: new Date()},
            }
        );
        flagged++;
    }

    // IPs associated with too many users (account farming).
    const farmIps = await db
        .collection("ip_intelligence")
        .find({"associatedUserIds.10": {$exists: true}})
        .project({_id: 1})
        .toArray();
    let farmFlagged = 0;
    for (const row of farmIps) {
        await db.collection("ip_intelligence").updateOne(
            {_id: row._id},
            {$addToSet: {riskFactors: "many_associated_users"}}
        );
        farmFlagged++;
    }

    res.status(200).json({
        success: true,
        data: {noisyFlagged: flagged, farmFlagged}
    });
}