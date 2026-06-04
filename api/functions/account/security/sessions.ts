/**
 * Account - User-facing session management.
 * GET: /api/account/security/sessions
 * POST: /api/account/security/sessions/:id/revoke
 * POST: /api/account/security/sessions/revoke-all
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../../../src/auth.js";
import { getDb } from "../../../../src/db.js";
import { withSecurity } from "../../../../src/security/middleware.js";
import { extractJti, revokeAllSessions, revokeSession } from "../../../../src/security/sessions.js";
import { logSecurityEvent } from "../../../../src/security/events.js";

export default withSecurity({endpoint: "ACCOUNT /api/account/security/sessions"})(async (
    req: VercelRequest,
    res: VercelResponse,
    ctx,
) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const currentJti = extractJti(req.headers.authorization);
    const db = await getDb();
    const url = req.url || "";

    if (req.method === "POST" && url.endsWith("/revoke-all")) {
        const count = await revokeAllSessions(user._id, currentJti);
        await logSecurityEvent({
            type: "admin.sessions_revoked_all",
            severity: "medium",
            source: {ip: ctx.clientIp, userId: user._id.toString()},
            details: {count},
            action: {taken: "revoke_all", automated: false},
        });
        res.status(200).json({success: true, data: {revoked: count}});
        return;
    }

    const revokeMatch = url.match(/\/sessions\/([a-f0-9]{24})\/revoke/i);
    if (revokeMatch && req.method === "POST") {
        const session = await db
            .collection("user_sessions")
            .findOne({_id: new ObjectId(revokeMatch[1]!), userId: user._id});
        if (!session) {
            res.status(404).json({success: false, error: "Session not found"});
            return;
        }
        if (session.jti === currentJti) {
            res.status(400).json({success: false, error: "Cannot revoke current session"});
            return;
        }
        const ok = await revokeSession(session.jti as string, user._id);
        if (ok) {
            await logSecurityEvent({
                type: "session.revoked",
                severity: "low",
                source: {ip: ctx.clientIp, userId: user.id.toString()},
                details: {sessionId: session._id.toString()},
                action: {taken: "revoke", automated: false},
            });
        }
        res.status(200).json({success: true});
        return;
    }

    if (req.method !== "GET") {
        res.setHeader("Allow", "GET, POST");
        res.status(405).json({success: false, error: "Method not allowed"});
        return;
    }

    const sessions = await db
        .collection("user_sessions")
        .find({userId: user._id, revoked: false})
        .sort({lastActiveAt: -1})
        .limit(200)
        .toArray();

    // Deduplicate: keep only the most-recent session per (ip + userAgent) pair.
    // Older duplicate sessions for the same device/browser are hidden from the
    // list but remain revocable by "sign out of all other devices".
    const seen = new Set<string>();
    const deduped = sessions.filter((s) => {
        const key = `${String(s.ip ?? "")}|${String(s.userAgent ?? "")}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    res.status(200).json({
        success: true,
        data: {
            sessions: deduped.map((s) => ({
                _id: s._id,
                jti: s.jti,
                ip: s.ip,
                userAgent: s.userAgent,
                country: s.country,
                city: s.city,
                issuedAt: s.issuedAt,
                lastActiveAt: s.lastActiveAt,
                isCurrent: s.jti === currentJti,
            })),
        },
    });
});
);