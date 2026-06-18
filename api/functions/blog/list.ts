import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {listBlogPosts} from "../../src/blog.js";
import {BLOG_LIST_PAGE_SIZE} from "@upcat/shared";

/**
 * GET /api/blog
 *
 * Public, paginated index of published blog posts. Drafts are never returned regardless of caller authentication.
 *
 * Query params:
 * - page: 1-based page number
 * - tag: filter by exact tag
 * - search: case-insensitive substring match against title + summary
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({error: "Method not allowed"});
    }
    const page = Number.parseInt(String(req.query.page ?? "1"), 10);
    const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.slice(0, 80) : undefined;
    try {
        const db = await getDb();
        const result = await listBlogPosts(db, {
            status: "published",
            page: Number.isFinite(page) ? page : 1,
            pageSize: BLOG_LIST_PAGE_SIZE,
            tag,
            search
        });
        res.setHeader("Cache-Control", "public,max-age=60,s-maxage=300");
        return res.status(200).json(result);
    } catch (err) {
        console.error("[blog/list] failed:", err);
        return res.status(500).json({error: "Failed to list posts"});
    }
}