import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../src/db.js";
import { HELP_CATEGORIES, isHelpCategory, stripMarkdown, toInt } from "../src/help.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const db = await getDb();
    const categoryRaw = String(req.query.category ?? "").trim();
    const search = String(req.query.search ?? "").trim();
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, toInt(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { status: "published" };
    if (categoryRaw && isHelpCategory(categoryRaw)) {
        query.category = categoryRaw;
    }
    if (search) {
        const regex = new RegExp(search.replace(/[\.*+?^${}()|\\]/g, "\\$&"), "i");
        query.$or = [
            { title: regex },
            { subtitle: regex },
            { "content.body": regex },
        ];
    }

    const [itemsRaw, total] = await Promise.all([
        db.collection("help_articles")
            .find(query)
            .project({
                _id: 0,
                slug: 1,
                title: 1,
                subtitle: 1,
                category: 1,
                subcategory: 1,
                order: 1,
                quickFacts: 1,
                faqs: 1,
                "content.body": 1,
                lastUpdatedAt: 1,
            })
            .sort({ category: 1, order: 1, title: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        db.collection("help_articles").countDocuments(query),
    ]);

    const items = itemsRaw.map((row) => {
        const body = String(row as { content?: { body?: string; } }).content?.body ?? "";
        const words = stripMarkdown(body).split(/\s+/).filter(Boolean).length;
        const estimatedReadingMinutes = Math.max(1, Math.ceil(words / 220));
        return {
            ...row as Record<string, unknown>,
            estimatedReadingMinutes,
        };
    });

    return res.status(200).json({
        success: true,
        data: {
            items,
            total,
            page,
            limit,
            categories: HELP_CATEGORIES,
        },
    });
}