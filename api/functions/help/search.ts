import { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../src/db.js";
import {highlightExcerpt, stripMarkdown} from "../../src/help.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    const q = String(req.query.q ?? "").trim();
    const minLength = Math.max(1, Number.parseInt(process.env.HELP_SEARCH_MIN_QUERY_LENGTH || "2", 10) || 2);
    if (q.length < minLength) {
        return res.status(200).json({success: true, data: {items: []}});
    }

    const regex = new RegExp(q.replace(/.*+?^$|()|\[\\]/g, "\\\\$&"), "i");
    const db = await getDb();
    const rows = await db.collection("help_articles")
        .find({
            status: "published",
            $or: [{title: regex}, {subtitle: regex}, {"content.body": regex}],
        })
        .project({id: 0, slug: 1, title: 1, subtitle: 1, category: 1, "content.body": 1})
        .limit(10)
        .toArray();

    await db.collection("help_search_analytics").updateOne(
        {term: q.toLowerCase()},
        {
            $inc: {count: 1},
            $set: {lastSearchedAt: new Date(), resultsCount: rows.length},
            $setOnInsert: {createdAt: new Date()},
        },
        {upsert: true},
    );

    const items = rows.map((row) => {
        const plain = stripMarkdown(String({content?: {body?: string}}.content?.body ?? ""));
        return {
            slug: row.slug,
            title: row.title,
            category: row.category,
            excerpt: highlightExcerpt(plain, q),
            subtitle: row.subtitle ?? null,
        };
    });

    return res.status(200).json({success: true, data: {items}});
}