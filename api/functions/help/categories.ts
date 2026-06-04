import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {HELP_CATEGORIES} from "../../src/help.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    const db = await getDb();
    const categoryDocs = await db
        .collection("help_categories")
        .find({})
        .project({_id: 0, category: 1, name: 1, description: 1, icon: 1})
        .toArray();
    const rows = await db
        .collection("help_articles")
        .aggregate([
            {$match: {status: "published"}},
            {$group: {_id: "$category", articleCount: {$sum: 1}}},
        ])
        .toArray();

    const countByCategory = new Map<string, number>();
    for (const row of rows) {
        countByCategory.set(String(row._id), Number(row.articleCount ?? 0));
    }

    return res.status(200).json({
        success: true,
        data: (categoryDocs.length ? categoryDocs : HELP_CATEGORIES).map((category) => ({
            ...category,
            articleCount: countByCategory.get(category.category) ?? 0,
        })),
    });
}