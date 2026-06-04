import { type { VercelRequest, VercelResponse } } from "@vercel/node";
import { requireAdmin } from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {listSeoOverrides} from "../../src/seo.js";

/**
 * POST /api/admin/seo/publish
 *
 * Exports all SEO overrides as a static JSON snapshot that can be saved to client/public/data/seo-overrides.json and bundled with the app. This eliminates per-page API calls for override lookups.
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    try {
        const db = await getDb();
        const overrides = await listSeoOverrides(db);

        // Build a path -> override map for fast client-side lookup
        const overrideMap: Record<string, typeof overrides[number]> = {};
        for (const o of overrides) {
            overrideMap[o.path] = o;
        }

        const payload = {
            version: 1,
            publishedAt: new Date().toISOString(),
            publishedBy: admin.email,
            meta: {
                totalOverrides: overrides.length,
            },
            overrides: overrideMap,
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
        console.error("SEO publish error:", error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to publish SEO overrides",
        });
    }
}