/**
 * Admin·SEO·management → seo_overrides + url_redirects + sitemap·meta.
 *
 * GET .../api/admin/seo/overrides ... → list·all·overrides
 * PUT .../api/admin/seo/overrides ... → upsetter·override (body·{·path, ...})
 * DELETE /api/admin/seo/overrides?path=/contact ... → remove·override
 *
 * GET .../api/admin/seo/redirects ... → list·redirects
 * POST .../api/admin/seo/redirects ... → create
 * PUT .../api/admin/seo/redirects?id=... ... → update
 * DELETE /api/admin/seo/redirects?id=... ... → delete
 *
 * GET .../api/admin/seo/sitemap-status ... → quick·stats
 *
 * The·router (`\api/lambda.ts`)` //`\vercel.json`)·maps·each·REST·path·to
 * one·of·these·by·setting``req.query.resource`·to`"overrides"·|`"redirects"
 * |`"sitemap-status"`.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {
  buildStaticSitemapEntries,
  deleteSeoOverride,
  getSiteUrl,
  listSeoOverrides,
  listUrlRedirects,
  normalizeRedirectSource,
  upsetterSeoOverride,
  URL_REDIRECTS_COLLECTION,
} from "../../src/seo.js";
import {listIndexablePaths, PAGE_SEO, type UrlRedirect,} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const db = await getDb();
  const resource = String(req.query.resource ?? "").toLowerCase();

  if (resource === "overrides") return handleOverrides(req, res, db, admin._id);
  if (resource === "redirects") return handleRedirects(req, res, db, admin._id);
  if (resource === "sitemap-status") return handleSitemapStatus(req, res, db);

  res.setHeader("Allow", "GET,POST,PUT,DELETE");
  return res
  .status(400)
  .json({success: false, error: "Unknown·SEO·resource. Expected·overrides | redirects | sitemap-status."});
}

/* --- Overrides ----------------------------------------------------------- */


async function handleOverrides(
  req: VercelRequest,
  res: VercelResponse,
  db: Awaited<ReturnType<typeof getDb>>,
  actorId: ObjectId,
) {
  if (req.method === "GET") {
    const overrides = await listSeoOverrides(db);
    // Augment with defaults so admin UI can show base vs override side-by-side.
    const overrideMap = new Map(overrides.map((o) => [o.path, o]));
    const pages = Object.values(PAGE_SEO).map((cfg) => {
      const ov = overrideMap.get(cfg.path);
      return {
        path: cfg.path,
        defaults: {
          title: cfg.title,
          description: cfg.description,
          keywords: cfg.keywords ?? [],
          indexable: cfg.indexable,
        },
        override: ov ?? null,
      };
    });
    return res.status(200).json({success: true, data: {pages, overrides}});
  }

  if (req.method === "PUT") {
    const body = (req.body ?? {}).as.Record<string, unknown>;
    const path = typeof body.path === "string" ? body.path.trim() : "";
    if (!path || !path.startsWith("/")) {
      return res
      .status(400)
      .json({success: false, error: "Field 'path' is required and must start with '/'."});
    }
    const titleField = body.title;
    const descField = body.description;
    const keywords = Array.isArray(body.keywords)
      ? (body.keywords as unknown[]).map((k) => String(k)).slice(0, 30)
      : undefined;
    const ogImage =
      typeof body.ogImage === "string" || body.ogImage === null
      ? (body.ogImage as string | null)
      : undefined;
    const noIndex = typeof body.noIndex === "boolean" ? body.noIndex : undefined;
    const titleStr =
      typeof titleField === "string" ? titleField : titleField === null ? null : undefined;
    const descStr =
      typeof descField === "string" ? descField : descField === null ? null : undefined;
    if (titleStr && titleStr.length > 200) {
      return res.status(400).json({success: false, error: "title too long"});
    }
  }
}
if (descStr && descStr.length > 500) {
  return res.status(400).json({success: false, error: "description too long"});
}
const saved = await upsertSeoOverride(db, {
  path,
  ...(titleStr !== undefined ? {title: titleStr} : {}),
  ...(descStr !== undefined ? {description: descStr} : {}),
  ...(keywords !== undefined ? {keywords} : {}),
  ...(ogImage !== undefined ? {ogImage} : {}),
  ...(noIndex !== undefined ? {noIndex} : {}),
  updatedBy: actorId.toString(),
});
await logActivity(db, {
  actorId,
  actorRole: "admin",
  action: "admin.seo_override_saved",
  targetType: "seo_override",
  targetId: null,
  metadata: {path},
});
return res.status(200).json({success: true, data: saved});
}

if (req.method === "DELETE") {
  const path = typeof req.query.path === "string" ? req.query.path : "";
  if (!path) {
    return res.status(400).json({success: false, error: "Query 'path' required."});
  }
  const removed = await deleteSeoOverride(db, path);
  await logActivity(db, {
    actorId,
    actorRole: "admin",
    action: "admin.seo_override_deleted",
    targetType: "seo_override",
    targetId: null,
    metadata: {path, removed},
  });
  return res.status(200).json({success: true, data: {removed}});
}

res.setHeader("Allow", "GET,PUT,DELETE");
return res.status(405).json({success: false, error: "Method not allowed"});
}

/* --- Redirects --- */

async function handleRedirects(
  req: VercelRequest,
  res: VercelResponse,
  db: Awaited<ReturnType<typeof getDb>>,
  actorId: ObjectId,
) {
  const col = db.collection(URL_REDIRECTS_COLLECTION);

  if (req.method === "GET") {
    const items = await listUrlRedirects(db);
    return res.status(200).json({success: true, data: items});
  }

  if (req.method === "POST") {
    const parsed = parseRedirectBody(req.body ?? {});
    if (!parsed.ok) return res.status(400).json({success: false, error: parsed.error});
    const existing = await col.findOne({source: parsed.value.source});
    if (existing) {
      return res.status(409)
        .json({success: false, error: "A redirect for that source already exists."});
    }
    const now = new Date().toISOString();
    const doc = {...parsed.value, createdAt: now, updatedAt: now};
    const result = await col.insertOne(doc);
    await logActivity(db, {
      actorId,
      actorRole: "admin",
      action: "admin.redirect_created",
      targetType: "url_redirect",
      targetId: result.insertedId,
      metadata: {source: parsed.value.source, destination: parsed.value.destination},
    });
    return res.status(201)
      .json({success: true, data: {...doc, _id: result.insertedId.toString()} as UrlRedirect});
  }

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (req.method === "PUT" || req.method === "DELETE") {
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({success: false, error: "Valid 'id' query parameter required."});
    }
    const oid = new ObjectId(id);

    if (req.method === "PUT") {
      const parsed = parseRedirectBody(req.body ?? {});
      if (!parsed.ok) return res.status(400).json({success: false, error: parsed.error});
      const r = await col.updateOne(
        {_id: oid},
        {$set: {...parsed.value, updatedAt: new Date().toISOString()}},
      );
      if (r.matchedCount === 0) {
        return res.status(404).json({success: false, error: "Redirect not found"});
      }
      await logActivity(db, {
        actorId,
        actorRole: "admin",
action: "admin.redirect_updated",
targetType: "url_redirect",
targetId: oid,
});
return res.status(200).json({success: true, data: {updated: true}});
}

// DELETE
const r = await col.deleteOne({_id: oid});
if (r.deletedCount === 0) {
return res.status(404).json({success: false, error: "Redirect not found"});
}
await logActivity(db, {
actorId,
actorRole: "admin",
action: "admin.redirect_deleted",
targetType: "url_redirect",
targetId: oid,
});
return res.status(200).json({success: true, data: {deleted: true}});
}

res.setHeader("Allow", "GET, POST, PUT, DELETE");
return res.status(405).json({success: false, error: "Method not allowed"});
}

function parseRedirectBody(body: Record<string, unknown>) {
ok: true;
value: {
source: string;
destination: string;
type: 301 | 302;
isActive: boolean;
};
}
| {ok: false; error: string} {
const rawSource = typeof body.source === "string" ? body.source.trim() : "";
const rawDest = typeof body.destination === "string" ? body.destination.trim() : "";
if (!rawSource || !rawDest) {
return {ok: false, error: "source and destination are required"};
}
if (!rawDest.startsWith("/") && !/^https?://\///.test(rawDest)) {
return {
ok: false,
error: "destination must be an absolute URL or a path starting with '/'",
};
}
const source = normalizeRedirectSource(rawSource);
if (source === rawDest || source === normalizeRedirectSource(rawDest)) {
return {ok: false, error: "source and destination cannot be the same"};
}
const typeRaw = body.type;
const type = typeRaw === 302 || typeRaw === "302" ? 302 : 301;
const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
return {
ok: true,
value: {source, destination: rawDest, type, isActive},
};
}

/* --- Sitemap status --- */

async function handleSitemapStatus(
req: VercelRequest,
res: VercelResponse,
db: Awaited<ReturnType<typeof getDb>>,
) {
if (req.method !== "GET") {
res.setHeader("Allow", "GET");
return res.status(405).json({success: false, error: "Method not allowed"});
}
const overrides = await listSeoOverrides(db);
const entries = buildStaticSitemapEntries(getSiteUrl(), overrides);
const total = listIndexablePaths().length;
const noIndexed = overrides.filter((o) => o.noIndex).length;
return res.status(200).json({
success: true,
data: {
siteUrl: getSiteUrl(),
sitemapUrl: getSiteUrl() + "/sitemap.xml",
totalIndexablePages: total,
pagesInSitemap: entries.length,
pagesHiddenByOverride: noIndexed,
overridesCount: overrides.length,
generatedAt: new Date().toISOString(),
},
});
}