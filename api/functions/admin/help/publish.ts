import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {HELP_CATEGORIES, stripMarkdown} from "../../src/help.js";

/**
 * -------------------------------------------------------------------------
 * POST /api/admin/help/publish
 *
 * Exports all published help content (categories, articles, metadata)
 * as a JSON file that can be bundled as a static asset.
 *
 * Response includes:
 * - categories: Array of help categories with metadata
 * - articles: All published articles with full content
 * - meta: Publication metadata (timestamp, count, etc)
 *
 * This JSON can be:
 * 1. Saved to `public/data/help-content.json`
 * 2. Bundled with the app
 * 3. Served statically instead of via dynamic API calls
 * -------------------------------------------------------------------------
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  try {
    const db = await getDb();

    // Fetch all published articles
    const articles = await db
      .collection("help_articles")
      .find({status: "published"})
      .project({
        _id: 0,
        slug: 1,
        title: 1,
        subtitle: 1,
        category: 1,
        subcategory: 1,
        order: 1,
        content: 1,
        quickFacts: 1,
        faqs: 1,
        relatedArticles: 1,
        relatedFeaturePages: 1,
        contextualHelpIds: 1,
        seoTitle: 1,
        seoDescription: 1,
        lastUpdatedAt: 1,
        viewCount: 1,
        helpfulCount: 1,
        notHelpfulCount: 1,
      })
      .sort({category: 1, order: 1, title: 1})
      .toArray();

    // Fetch all categories
    const categoryDocs = await db
      .collection("help_categories")
      .find({})
      .project({_id: 0, category: 1, name: 1, description: 1, icon: 1})
      .toArray();

    const categories = categoryDocs.length ? categoryDocs : HELP_CATEGORIES;

    // Count articles per category
    const articleCountByCategory = new Map<string, number>();
    for (const article of articles) {
      const cat = String(article.category ?? "");
      articleCountByCategory.set(cat, (articleCountByCategory.get(cat) ?? 0) + 1);
    }

    // Enrich categories with article counts
    const enrichedCategories = categories.map((cat) => ({
      ...cat,
      articleCount: articleCountByCategory.get(cat.category) ?? 0,
    }));
    // Calculate article metadata for each article
    const enrichedArticles = articles.map((article) => {
      const body = String((article.as({content?: {body?: string}})).content?.body ?? "");
      const plainText = stripMarkdown(body);
      const wordCount = plainText.split(/\s+/).filter(Boolean).length;
      const estimatedReadingMinutes = Math.max(1, Math.ceil(wordCount / 220));

      return {
        ...article,
        wordCount,
        estimatedReadingMinutes,
      };
    }));
    // Build the static content export
    const staticContent = {
      version: 1,
      publishedAt: new Date().toISOString(),
    };
publishedBy: admin.email,
meta: {
  totalArticles: articles.length,
  totalCategories: enrichedCategories.length,
  lastUpdatedAt: articles.length > 0
  ? new Date(Math.max(...articles.map(a => new Date((a as any).lastUpdatedAt ?? 0).getTime())))).toISOString()
  : new Date().toISOString(),
},
categories: enrichedCategories,
articles: enrichedArticles,
};

// Return the static content
// This should be saved to `public/data/help-content.json` during build
return res.status(200).json({
  success: true,
  data: {
    exported: true,
    contentSize: JSON.stringify(staticContent).length,
    payload: staticContent,
  },
});
} catch (error) {
  console.error("Help publish error:", error);
  return res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : "Failed to publish help content",
  });
}
}