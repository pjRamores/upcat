import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../src/db.js";
import { resolveOptionalUser } from "../../src/help.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const slug = String(req.query.slug ?? "").trim();
    if (!slug) {
        return res.status(400).json({ success: false, error: "Missing article slug" });
    }

    const helpfulRaw = (req.body as { helpful?: unknown } | undefined)?.helpful;
    if (typeof helpfulRaw !== "boolean") {
        return res.status(400).json({ success: false, error: "Body helpful must be boolean" });
    }
    const comment = String((req.body as { comment?: unknown } | undefined)?.comment ?? "").trim();

    const db = await getDb();
    const article = await db.collection("help_articles").findOne({ slug, status: "published" });
    if (!article) {
        return res.status(404).json({ success: false, error: "Article not found" });
    }

    const user = await resolveOptionalUser(db, req);

    await Promise.all([
        db.collection("help_articles").updateOne(
            { _id: article._id },
            { $inc: helpfulRaw ? { helpfulCount: 1 } : { notHelpfulCount: 1 } },
        ),
        db.collection("help_feedback").insertOne({
            articleSlug: slug,
            helpful: helpfulRaw,
            comment: comment || null,
            userId: user?._id ?? null,
            createdAt: new Date(),
            userAgent: req.headers["user-agent"] ?? null,
        }),
    ]);

    return res.status(200).json({ success: true, data: { recorded: true } });
}