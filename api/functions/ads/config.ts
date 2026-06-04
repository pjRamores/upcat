import { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../src/db.js";
import {getPublicAdsConfig} from "../../src/ads.js";

/**
 * GET /api/ads/config
 *
 * Returns the public AdSense configuration the client uses to decide whether/where/how to render ad slots. Cached briefly so we never spam Mongo on busy pages but settings changes still propagate within a few minutes.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({error: "Method not allowed"});
    }
    try {
        const db = await getDb();
        const config = await getPublicAdsConfig(db);
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
        return res.status(200).json(config);
    } catch (err) {
        console.error("[ads/config] failed:", err);
        return res.status(500).json({error: "Failed to load ads config"});
    }
}