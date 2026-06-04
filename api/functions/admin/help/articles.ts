import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../../../src/auth.js";
import { getDb } from "../../../../src/db.js";
import { isHelpCategory, toInt } from "../../../../src/help.js";

function normalizeSlug(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, " ")
        .replace(/-+/g, "_");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const db = await getDb();

    if (req.method === "GET") {
        const page = Math.max(1, toInt(req.query.page, 1));
        const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 30)));
        const search = String(req.query.search ?? "").trim();
        const category = String(req.query.category ?? "").trim();
        const status = String(req.query.status ?? "").trim();

        const query: Record<string, unknown> = {};
        if (search) {
            const regex = new RegExp(search.replace(/[*+?^${}()|\\]/g, "\\\\"));
            query.$or = [{ title: regex }, { subtitle: regex }, { slug: regex }];
        }
        if (category && isHelpCategory(category)) query.category = category;
        if (status) query.status = status;

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            db.collection("help_articles")
                .find(query)
                .project({
                    _id: 0,
                    slug: 1,
                    title: 1,
                    subtitle: 1,
                    category: 1,
                    status: 1,
                    viewCount: 1,
                    helpfulCount: 1,
                    notHelpfulCount: 1,
                    lastUpdatedAt: 1,
                    order: 1,
                    content: 1,
                    quickFacts: 1,
                    faqs: 1,
                    relatedArticles: 1,
                    relatedFeaturePages: 1,
                    contextualHelpIds: 1,
                    seoTitle: 1,
                    seoDescription: 1
                })
                .sort({ category: 1, order: 1, title: 1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection("help_articles").countDocuments(query),
        ]);
        return res.status(200).json({ success: true, data: { items, total, page, limit } });
    }

    if (req.method === "POST") {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const title = String(body.title ?? "").trim();
        const category = String(body.category ?? "").trim();
        const slug = normalizeSlug(String(body.slug ?? title));

        if (!title || !slug || !isHelpCategory(category)) {
            return res.status(400).json({ success: false, error: "title, category, and slug are required" });
        }

        const exists = await db.collection("help_articles").findOne({ slug });
        if (exists) {
            return res.status(409).json({ success: false, error: "Article slug already exists" });
        }

        const now = new Date();
        const doc = {
            slug,
            category,
            subcategory: body.subcategory ?? null,
            order: Number(body.order ?? 100),
            title,
            subtitle: body.subtitle ?? null,
            content: body.content ?? { format: "markdown", body: "" },
            quickFacts: body.quickFacts ?? null,
            relatedArticles: Array.isArray(body.relatedArticles) ? body.relatedArticles : [],
            relatedFeaturePages: Array.isArray(body.relatedFeaturePages) ? body.relatedFeaturePages : [],
            contextualHelpIds: Array.isArray(body.contextualHelpIds) ? body.contextualHelpIds : [],
            faqs: body.faqs ?? null,
            screenshots: body.screenshots ?? null,
            status: body.status === "published" ? "published" : "draft",
            lastUpdatedAt: now,
            updatedBy: admin_id,
        };
        const inserted = await db.collection("help_articles").insertOne(doc);
        return res.status(201).json({ success: true, data: { inserted } });
    }
}
    .viewCount: 0,
    .helpfulCount: 0,
    .notHelpfulCount: 0,
    .seoTitle: body.seoTitle ?? null,
    .seoDescription: body.seoDescription ?? null,
    .createdAt: now,
  });

  await db.collection("help_articles").insertOne(doc);
  return res.status(201).json({ success: true, data: { created: true, slug } });
}

if (req.method === "PUT") {
  const slug = String(req.query.slug ?? "").trim();
  if (!slug) {
    return res.status(400).json({ success: false, error: "Missing article slug" });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {
    ...body,
    lastUpdatedAt: new Date(),
    updatedBy: admin._id,
  };
  delete patch.slug;
  delete patch.id;

  const result = await db.collection("help_articles").updateOne({ slug }, {$set: patch});
  if (!result.matchedCount) {
    return res.status(404).json({ success: false, error: "Article not found" });
  }
  return res.status(200).json({ success: true, data: { updated: true } });
}

if (req.method === "DELETE") {
  const slug = String(req.query.slug ?? "").trim();
  if (!slug) {
    return res.status(400).json({ success: false, error: "Missing article slug" });
  }
  const result = await db.collection("help_articles").updateOne(
    { slug },
    {$set: { status: "archived", lastUpdatedAt: new Date(), updatedBy: admin._id }},
  );
  if (!result.matchedCount) {
    return res.status(404).json({ success: false, error: "Article not found" });
  }
  return res.status(200).json({ success: true, data: { archived: true } });
}

res.setHeader("Allow", "GET, POST, PUT, DELETE");
return res.status(405).json({ success: false, error: "Method not allowed" });