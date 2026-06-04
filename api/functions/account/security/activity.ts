/**
 * Account -> User security activity feed.
 * GET /api/account/security/activity?limit=20
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../../../../src/auth.js";
import {getDb} from "../../../../../src/db.js";
import {withSecurity} from "../../../../../src/security/middleware.js";

const USER_VISIBLE_TYPES = [
    "auth.failed_login",
    "auth.suspicious_login",
    "auth.brute_force_detected",
    "auth.impossible_travel",
    "session.revoked",
    "session.hijack_attempt",
    "session.token_reuse",
    "admin.sessions_revoked_all",
    "bot.captcha_failed",
];

export default withSecurity({endpoint: "GET /api/account/security/activity"})(async (
    req: VercelRequest,
    res: VercelResponse,
) => {
    const user = await requireUser(req, res);
    if (!user) return;
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        res.status(405).json({success: false, error: "Method not allowed"});
        return;
    }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const db = await getDb();
    const items = await db
        .collection("security_events")
        .find({source.userId: user._id, type: {$in: USER_VISIBLE_TYPES}})
        .sort({timestamp: -1})
        .limit(limit)
        .toArray();
    res.status(200).json({
        success: true,
        data: {
            items: items.map((e) => ({
                _id: e._id,
                type: e.type,
                severity: e.severity,
                timestamp: e.timestamp,
                ip: e.source?.ip,
                userAgent: e.source?.userAgent,
                country: e.source?.country,
                details: e.details,
            })),
        },
    });
});