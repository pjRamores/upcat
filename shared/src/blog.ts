/**
 * Blog system shared types and helpers.
 *
 * Slice D ships a minimal blog: posts have a slug, title, summary,
 * markdown body, hero image, optional tags, an author display name, and a
 * publication status. No comments, no taxonomies, no scheduled publishing
 * (publishedAt is set when status flips to "published").
 */

export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface BlogPost {
  /** Mongo ObjectId as string. */
  _id: string;
  /** URL-safe slug, unique. Lowercase, hyphenated. */
  slug: string;
  title: string;
  /** 1-2 sentence summary used in listings + meta description. */
  summary: string;
  /** Markdown body. */
  body: string;
  /** Optional hero image absolute URL. */
  heroImage?: string | null;
  /** Display name (we keep author as a string to avoid a join + user PII). */
  authorName: string;
  tags: string[];
  status: BlogStatus;
  /** ISO timestamp; only set once the post is first published. */
  publishedAt: string | null;
  /** ISO timestamp the post was last edited. */
  updatedAt: string;
  /** ISO timestamp the post was created. */
  createdAt: string;
}

/** Lightweight view returned by listing endpoints. */
export interface BlogPostSummary {
  _id: string;
  slug: string;
  title: string;
  summary: string;
  heroImage?: string | null;
  authorName: string;
  tags: string[];
  publishedAt: string | null;
  updatedAt: string;
}

/** Page-size cap for the public blog index. */
export const BLOG_LIST_PAGE_SIZE = 12;

/** Permitted slug character class. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Returns whether a slug is well-formed (lowercase kebab-case, no edge dashes). */
export function isValidBlogSlug(slug: string): boolean {
  if (slug.length < 1 || slug.length > 120) return false;
  return SLUG_RE.test(slug);
}

/**
 * Best-effort slugifier. Collapses runs of non-alphanumerics into single
 * hyphens, lowercases, and trims edge dashes. Falls back to a placeholder
 * when nothing usable remains.
 */
export function slugifyBlogTitle(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[^\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || "post";
}

/** Read time in minutes from a markdown body, assuming 220 wpm. */
export function estimateReadMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}