import { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireAdmin} from "../../../../src/auth.js";
import {logActivity} from "../../../../src/activityLog.js";

import {
    BlogConflictError,
    BlogValidationError,
    createBlogPost,
    deleteBlogPost,
    getBlogPostById,
    listBlogPosts,
    updateBlogPost,
} from "../../src/blog.js";
import {BLOG_STATUSES, type BlogStatus} from "@upcat/shared";

/**
 * Admin blog CRUD.
 *
 * GET /api/admin/blog -> paginated list (any status)
 * POST /api/admin/blog -> create a post
 * GET /api/admin/blog/:id -> fetch a single post (incl. drafts)
 * PUT /api/admin/blog/:id -> update a post
 * DELETE /api/admin/blog/:id -> delete a post
 *
 * Lambda dispatcher rewrites `:id` into `req.query.id`. All mutations append an activity log entry.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const db = await getDb();
    const id = typeof req.query.id === "string" ? req.query.id : null;

    try {
        if (!id) {
            if (req.method === "GET") {
                const page = Number.parseInt(String(req.query.page ?? "1"), 10);
                const status = String(req.query.status ?? "any") as BlogStatus | "any";
                const result = await listBlogPosts(db, {
                    status: BLOG_STATUSES.includes(status as BlogStatus)
                        ? status
                        : "any",
                    page: Number.isFinite(page) ? page : 1,
                });
                return res.status(200).json(result);
            }
            if (req.method === "POST") {
                const body = { ... } as Record<string, unknown>;
                const post = await createBlogPost(db, {
                    slug: typeof body.slug === "string" ? body.slug : undefined,
                    title: String(body.title ?? ""),
                    summary: String(body.summary ?? ""),
                    body: String(body.body ?? ""),
                    heroImage: typeof body.heroImage === "string" ? body.heroImage : null,
                    authorName: String(body.authorName ?? admin.firstName ?? "Editor"),
                    tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
                    status: BLOG_STATUSES.includes(body.status as BlogStatus)
                        ? body.status
                        : "draft",
                });
                await logActivity(db, {
                    actorId: String(admin._id),
                    actorRole: "admin",
                    action: "admin.blog.create",
                    targetType: "blog_post",
                    targetId: post.id,
                    metadata: { slug: post.slug, status: post.status },
                });
                return res.status(201).json(post);
            }
            res.setHeader("Allow", ["GET", "POST"]);
            return res.status(405).json({ error: "Method not allowed" });
        }

        // Single-post operations.
        if (req.method === "GET") {
            const post = await getBlogPostById(db, id);
            if (!post) return res.status(404).json({ error: "Not found" });
            return res.status(200).json(post);
        }
        if (req.method === "PUT") {
            const body = { ... } as Record<string, unknown>;
            const updated = await updateBlogPost(db, id, {
                slug: typeof body.slug === "string" ? body.slug : undefined,
                title: typeof body.title === "string" ? body.title : undefined,
                summary: typeof body.summary === "string" ? body.summary : undefined,
                body: typeof body.body === "string" ? body.body : undefined,
                heroImage:
                    body.heroImage === null
                        ? null
                        : typeof body.heroImage === "string"
                        ? body.heroImage
                        : undefined,
                authorName: typeof body.authorName === "string" ? body.authorName : undefined,
                tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
                status: BLOG_STATUSES.includes(body.status as BlogStatus)
                    ? body.status
                    : undefined,
            });
            if (!updated) return res.status(404).json({ error: "Not found" });
            await logActivity(db, {
                actorId: String(admin._id),
                actorRole: "admin",
                action: "admin.blog.update",
targetType: "blog_post",
targetId: updated._id,
metadata: {slug: updated.slug, status: updated.status},
});
return res.status(200).json(updated);
}

if (req.method === "DELETE") {
    const ok = await deleteBlogPost(db, id);
    if (!ok) return res.status(404).json({error: "Not found"});
    await logActivity(db, {
        actorId: String(admin._id),
        actorRole: "admin",
        action: "admin.blog.delete",
        targetType: "blog_post",
        targetId: id,
    });
    return res.status(204).end();
}

res.setHeader("Allow", "GET, PUT, DELETE");
return res.status(405).json({error: "Method not allowed"});
} catch (err) {
    if (err instanceof BlogValidationError) {
        return res.status(400).json({error: err.message});
    }
    if (err instanceof BlogConflictError) {
        return res.status(409).json({error: err.message});
    }
    console.error("[admin/blog] failed:", err);
    return res.status(500).json({error: "Internal error"});
}