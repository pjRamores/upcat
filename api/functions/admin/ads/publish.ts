import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../../../../src/auth.js";
import { getDb } from "../../../../../src/db.js";
import { getPublicAdsConfig } from "../../../../../src/ads.js";

/**
 * POST /api/admin/ads/publish
 *
 * Exports the current public ads config as a static JSON snapshot for
 * client/public/data/ads-config.json.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const db = await getDb();
        const config = await getPublicAdsConfig(db);

        const payload = {
            version: 1,
            publishedAt: new Date().toISOString(),
            publishedBy: admin.email,
            meta: {
                adsEnabled: config.enabled,
                configuredSlots: Object.keys(config.slots ?? {}).length,
            },
            config,
        };

        return res.status(200).json({
            success: true,
            data: {
                exported: true,
                contentSize: JSON.stringify(payload).length,
                payload,
            },
        });
    } catch (error) {
        console.error("Ads-config publish error:", error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to publish ads config",
        });
    }
}