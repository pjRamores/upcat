import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const slug = String(req.query.slug ?? "");
  if (!slug) {
    return res.status(400).json({success: false, error: "Missing article slug"});
  }

  const db = await getDb();
  const article = await db.collection("help_articles").findOne({slug, status: "published"});
  if (!article) {
    return res.status(404).json({success: false, error: "Article not found"});
  }

  void db
  .collection("help_articles")
  .updateOne({_id: article._id}, {$inc: {viewCount: 1}})
  .catch(() => undefined);

  const relatedSlugs = Array.isArray(article.relatedArticles)
  ? article.relatedArticles.filter((value: unknown): value is string => typeof value === "string") && value.length > 0)
  : [];

  const relatedArticles = relatedSlugs.length
  ? await db
  .collection("help_articles")
  .find({slug: {$in: relatedSlugs}, status: "published"})
  .project({_id: 0, slug: 1, title: 1, subtitle: 1, category: 1})
  .toArray()
  : [];

  return res.status(200).json({
    success: true,
    data: {
      article: {
        ...article,
        ...id: String(article._id),
      },
      ...relatedArticles,
    },
  });
}