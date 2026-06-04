/**
 * Public page-meta endpoint. The client calls this when rendering
 * <SEOHead /> to layer admin-managed overrides on top of the static
 * defaults. Returns 200 + null override if no override is configured
 * so the client can cache the negative response.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {getSeoOverride} from "../../src/seo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const raw = typeof req.query.path === "string" ? req.query.path : "/";
    // Normalize path: ensure leading slash, strip trailing slash (except root)
    let path = raw.startsWith("/") ? raw : "/" + raw;
    if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");

    let override = null;
    try {
        const db = await getDb();
        override = await getSeoOverride(db, path);
    } catch {
        override = null;
    }

    res.setHeader(
        "Cache-Control",
        "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
    );
    return res.status(200).json({success: true, data: {path, override}});
}