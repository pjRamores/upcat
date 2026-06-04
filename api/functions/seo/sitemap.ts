/**
 * Public sitemap. Served at both /api/seo/sitemap and /sitemap.xml
 * (via Vercel rewrite + express alias). Cached aggressively at the edge.
 * GET /sitemap.xml
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {buildStaticSitemapEntries, getSiteUrl, listSeoOverrides, renderSitemapXml} from "../../src/seo.js";
import {listPublishedSlugs} from "../../src/blog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const siteUrl = getSiteUrl();

    let overrides: Awaited<ReturnType<typeof listSeoOverrides>> = [];
    let blogSlugs: Awaited<ReturnType<typeof listPublishedSlugs>> = [];
    try {
        const db = await getDb();
        [overrides, blogSlugs] = await Promise.all([
            listSeoOverrides(db),
            listPublishedSlugs(db).catch(() => []),
        ]);
    } catch {
        // If the DB is unreachable, fall back to the static page registry.
        overrides = [];
        blogSlugs = [];
    }

    const entries = buildStaticSitemapEntries(siteUrl, overrides);
    for (const {slug, updatedAt} of blogSlugs) {
        entries.push({
            loc: `${siteUrl}/blog/${slug}`,
            lastmod: updatedAt.slice(0, 10),
            changefreq: "monthly",
            priority: 0.6,
        });
    }
    const ttlHours = Number.parseInt(process.env.SITEMAP_REVALIDATE_HOURS ?? "24", 10);
    const ttlSeconds = Math.max(60, Number.isFinite(ttlHours) ? ttlHours * 3600 : 86400);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
        "Cache-Control",
        `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=600`,
    );
    return res.status(200).send(renderSitemapXml(entries));
}