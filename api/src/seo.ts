/**
 * Server-side SEO helpers: sitemap XML generation, robots.txt, ads.txt
 * rendering, and accessors for the seo_overrides + url_redirects collections.
 */
import type {Db} from "mongodb";
import {
  DEFAULT_SITE_URL,
  listIndexablePaths,
  type PageSeoConfig,
  type SeoOverride,
  type SitemapChangeFreq,
  type UrlRedirect,
} from "@upcat/shared";

export function getSiteUrl(): string {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "")
}

export function getDefaultOgImage(): string {
  const env = process.env.OG_DEFAULT_IMAGE;
  if (env) return env;
  return `${getSiteUrl()}/og/default-card.png`;
}

/* --- seo_overrides collection --------------------------------------------------- */

export const SEO_OVERRIDES_COLLECTION = "seo_overrides";

export async function listSeoOverrides(db: Db): Promise<SeoOverride[]> {
  const docs = await db
    .collection<SeoOverride> & { _id?: unknown }>(SEO_OVERRIDES_COLLECTION)
    .find({})
    .toArray();
  return docs.map(({ _id: _ignored, ...rest }) => {
    void _ignored;
    return rest as SeoOverride;
  });
}

export async function getSeoOverride(
  db: Db,
  path: string,
) : Promise<SeoOverride | null> {
  const doc = await db
    .collection<SeoOverride> & { _id?: unknown }>(SEO_OVERRIDES_COLLECTION)
    .findOne({ path });
  if (!doc) return null;
  const { _id: _ignored, ...rest } = doc;
  void _ignored;
  return rest as SeoOverride;
}

export async function upsertSeoOverride(
  db: Db,
  override: Omit<SeoOverride, "updatedAt"> & { updatedBy?: string | null },
) : Promise<SeoOverride> {
  const updatedAt = new Date().toISOString();
  const doc: SeoOverride = {...override, updatedAt};
  await db
    .collection(SEO_OVERRIDES_COLLECTION)
    .updateOne(
      { path: override.path },
      {$set: doc},
      {upsert: true},
    );
    return doc;
}

export async function deleteSeoOverride(
  db: Db,
  path: string,
) : Promise<boolean> {
  const r = await db
    .collection(SEO_OVERRIDES_COLLECTION)
    .deleteOne({ path });
  return (r.deletedCount ?? 0) > 0;
}

/* --- url_redirects collection --------------------------------------------------- */

export const URL_REDIRECTS_COLLECTION = "url_redirects";

export async function listUrlRedirects(db: Db): Promise<UrlRedirect[]> {
  const docs = await db
    .collection<UrlRedirect> & { _id?: unknown }>(URL_REDIRECTS_COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => ({ ...d, _id: String(d._id) }) as UrlRedirect);
}

export async function findActiveRedirect(
  db: Db,
  source: string,
) : Promise<UrlRedirect | null> {
  const normalized = normalizeRedirectSource(source);
  const doc = await db
    .collection<UrlRedirect> & { _id?: unknown }>(URL_REDIRECTS_COLLECTION)
    .findOne({ source: normalized, isActive: true });
  if (!doc) return null;
  return { ...doc, _id: String(doc._id) } as UrlRedirect;
}
let s = source.trim();
if (!s.startsWith("/")) s = "/" + s;
if (s.length > 1 && s.endsWith("/")) s = s.replace(/\/+$/, "");
return s.toLowerCase();
}

/* —— Sitemap rendering —— */

export interface SitemapEntry {
  loc: string;
  lastmod?: string; // ISO date or YYYY-MM-DD
  changefreq?: SitemapChangeFreq;
  priority?: number;
}

const xmlEscape = (s: string): string =>
s
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&apos;");

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
  .map((e) => {
    const parts: string[] = [ `<loc>${xmlEscape(e.loc)}</loc>` ];
    if (e.lastmod) parts.push(`<lastmod>${xmlEscape(e.lastmod)}</lastmod>`);
    if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
    if (typeof e.priority === "number")
      parts.push(`<priority>${e.priority.toFixed(1)}</priority>`);
    return `<url>${parts.join("")}</url>`;
  })
  .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * Build sitemap entries from the static page registry plus any per-path
 * overrides (which can flip `noIndex` on, hiding a page from the sitemap).
 */
export function buildStaticSitemapEntries(
  siteUrl: string,
  overrides: SeoOverride[] = [],
) : SitemapEntry[] {
  const overrideByPath = new Map(overrides.map((o) => [o.path, o]));
  return listIndexablePaths()
  .filter((cfg) => {
    const ov = overrideByPath.get(cfg.path);
    return !ov?.noIndex;
  })
  .sort((a, b) => (b.priority ?? 0.5) - (a.priority ?? 0.5))
  .map((cfg: PageSeoConfig) => ({
    loc: siteUrl + (cfg.path === "/" ? "/" : cfg.path),
    changefreq: cfg.changefreq,
    priority: cfg.priority,
  }));
}

/* —— robots.txt rendering —— */

/**
 * Paths that crawlers must NOT index. Kept as a constant so admin can
 * inspect it and so unit tests can assert the list is comprehensive.
 */
export const ROBOTS_DISALLOW = [
  "/dashboard",
  "/exam/",
  "/practice/",
  "/results/",
  "/review/",
  "/stats",
  "/settings",
  "/profile",
  "/admin/",
  "/api/",
  "/auth/callback/",
  "/verify-email",
  "/reset-password",
  "/recover-account",
  "/account/",
  "/support",
];

export function renderRobotsTxt(siteUrl: string): string {
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...ROBOTS_DISALLOW.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ];
  return lines.join("\n");
}

/* —— ads.txt rendering —— */

/**
 * Render the ads.txt body. Per IAB Tech Lab spec each non-comment line is:
 * <domain>, <publisher.account.id>, <relationship>, <certification.authority.id>
 * If no publisher ID is configured we emit a placeholder comment so that
 * deploying the route doesn't accidentally publish a misleading record.
 */
export function renderAdsTxt(publisherId: string | null | undefined): string {
  if (!publisherId) {
    return "# ads.txt - no AdSense publisher ID configured yet.\n# Set ADSENSE_PUBLISHER_ID env var or configure via /admin/ads/settings.\n";
  }
  const id = publisherId.replace(/^ca-/, "");
  return `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`;
}

export function getAdsensePublisherId(): string | null {
  const id = process.env.ADSENSE_PUBLISHER_ID?.trim();
  return id ? id : null;
}