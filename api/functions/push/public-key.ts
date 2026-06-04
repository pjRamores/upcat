/**
 * GET /api/push/public-key
 *
 * Returns the VAPID public key the client must use to subscribe.
 * Public - but only meaningful to authenticated users (the SW is registered per-user).
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getVapidConfig} from "../../src/push.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const cfg = getVapidConfig();
    if (!cfg) {
        return res.status(503).json({
            success: false,
            error: "Push notifications are not configured on this server.",
        });
    }
    return res.status(200).json({
        success: true,
        data: {publicKey: cfg.publicKey},
    });
}