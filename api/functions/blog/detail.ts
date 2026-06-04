import {type{VercelRequest,VercelResponse}} from "@vercel/node";
import {getDb} from "../src/db.js";
import {getBlogPostBySlug} from "../src/blog.js";

/**
 * GET /api/blog/:slug
 *
 * Returns a single published post by slug. 404 for unknown or draft slugs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({error: "Method not allowed"});
    }
    const slug = String(req.query.slug ?? "").trim().toLowerCase();
    if (!slug) return res.status(400).json({error: "Missing slug"});
    try {
        const db = await getDb();
        const post = await getBlogPostBySlug(db, slug);
        if (!post) return res.status(404).json({error: "Not found"});
        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
        return res.status(200).json(post);
    } catch (err) {
        console.error("[blog/detail] failed:", err);
        return res.status(500).json({error: "Failed to load post"});
    }
}