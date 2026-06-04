/**
 * Static Help Content Loader
 *
 * Loads help content from static assets (client/public/data/help-content.json)
 * with automatic fallback to dynamic API if static content is unavailable.
 *
 * This provides:
 * - Instant page loads (no network latency for help content)
 * - Offline support
 * - Reduced API pressure
 * - Deterministic content (published snapshots)
 */

import type {HelpArticle, HelpCategoryInfo} from "@upcat/shared";

export interface StaticHelpContent {
    version: number;
    publishedAt: string;
    publishedBy: string;
    meta: {
        totalArticles: number;
        totalCategories: number;
        lastUpdatedAt: string;
    };
    categories: (HelpCategoryInfo & { articleCount: number })[];
    articles: (HelpArticle & { wordCount: number; estimatedReadingMinutes: number })[];
}

let cachedContent: StaticHelpContent | null = null;
let loadAttempted = false;
let loadError: Error | null = null;
let inFlightLoad: Promise<StaticHelpContent | null> | null = null;

/**
 * Load static help content from client/public/data/help-content.json
 * Returns null if not found or on error (will trigger API fallback)
 */
export async function loadStaticHelpContent(
    forceReload = false
): Promise<StaticHelpContent | null> {
    if (forceReload) {
        inFlightLoad = null;
    }

    // Return cached content if already loaded
    if (cachedContent && !forceReload) {
        return cachedContent;
    }

    // Reuse an active fetch so concurrent callers don't trigger duplicate requests.
    if (inFlightLoad && !forceReload) {
        return inFlightLoad;
    }

    // Prevent repeated failed attempts
    if (loadAttempted && loadError && !forceReload) {
        return null;
    }

    inFlightLoad = async () => {
        try {
            const response = await fetch("/data/help-content.json", {
                cache: "no-store",
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                // 404 or other error - static content not available
                loadError = new Error(`Failed to load static content: ${response.status}`);
                loadAttempted = true;
                return null;
            }

            const content = (await response.json()) as StaticHelpContent;

            // Validate structure
            if (!content.version || !Array.isArray(content.categories) || !Array.isArray(content.articles)) {
                throw new Error("Invalid static content structure");
            }

            cachedContent = content;
            loadError = null;
            loadAttempted = true;

            console.debug(
                `[HelpContent] Loaded static content: ${content.meta.totalArticles} articles, ${content.meta.totalCategories} categories`
            );

            return cachedContent;
        } catch (error) {
            loadError = error instanceof Error ? new Error(String(error));
            loadAttempted = true;
            console.warn("[HelpContent] Failed to load static content, will use API fallback", loadError.message);
            return null;
        } finally {
            inFlightLoad = null;
        }
    })();
}
return inFlightLoad;
}

/**
 * Get all categories from static content
 * Provides type-safe access to category list
 */
export function getStaticCategories(content: StaticHelpContent): HelpCategoryInfo[] {
    return content.categories.map((cat) => ({
        category: cat.category,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
    }));
}

/**
 * Search articles in static content
 * Simple full-text search across title, subtitle, and body
 */
export function searchStaticArticles(
    content: StaticHelpContent,
    query: string,
    limit = 10
): Array<{
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    subtitle?: string | null;
}> {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return [];

    // Build a simple search index
    const results: Array<{
        article: (HelpArticle & { wordCount: number; estimatedReadingMinutes: number });
        matchScore: number;
    }> = [];

    for (const article of content.articles) {
        const title = String(article.title ?? "").toLowerCase();
        const subtitle = String(article.subtitle ?? "").toLowerCase();
        const body = String(
            (article as Record<string, unknown>).content instanceof Object &&
                (article as Record<string, unknown>).content !== null
                ? ((article as Record<string, unknown>).content as Record<string, unknown>).body
                : ""
        ).toLowerCase();

        let score = 0;

        // Title match is most important
        if (title.includes(searchTerm)) score += 10;
        // Subtitle match is second
        if (subtitle.includes(searchTerm)) score += 5;
        // Body match is least important
        if (body.includes(searchTerm)) score += 1;

        // Count occurrences in body for relevance
        const bodyMatches = (body.match(new RegExp(searchTerm, "g")) || []).length;
        score += Math.min(bodyMatches, 5); // Cap at 5 for very long matches

        if (score > 0) {
            results.push({ article, matchScore: score });
        }
    }

    // Sort by match score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    // Generate excerpts from body content
    return results.slice(0, limit).map(({ article }) => {
        const body = String(
            (article as Record<string, unknown>).content instanceof Object &&
                (article as Record<string, unknown>).content !== null
                ? ((article as Record<string, unknown>).content as Record<string, unknown>).body
                : ""
        );

        // Extract a snippet around the search term
        const lowerBody = body.toLowerCase();
        const index = lowerBody.indexOf(query.toLowerCase());
        const start = Math.max(0, index - 100);
        const end = Math.min(body.length, index + 200);
        let excerpt = body.substring(start, end);
        if (start > 0) excerpt = "..." + excerpt;
        if (end < body.length) excerpt = excerpt + "...";

        return {
            slug: article.slug,
            title: article.title,
            excerpt: excerpt || "No preview available",
            category: article.category,
            subtitle: article.subtitle ?? null,
        };
    });
}

/**
 * Get articles by category from static content
 */
export function getStaticArticlesByCategory(
    content: StaticHelpContent,
    categoryId: string,
    limit?: number
): Array<HelpArticle & { "slug": string; "title": string; "subtitle": string; "category": string } & {
    estimatedReadingMinutes: number;
}>
{
  const items = content.articles
    .filter((a) => a.category === categoryId)
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      subtitle: a.subtitle ?? null,
      category: a.category,
      estimatedReadingMinutes: (a as any).estimatedReadingMinutes || 1,
    }));
  
  return limit ? items.slice(0, limit) : items;
}

/**
 * Get a single article by slug from static content
 */
export function getStaticArticle(
  content: StaticHelpContent,
  slug: string
): HelpArticle & { wordCount: number; estimatedReadingMinutes: number } | null {
  return content.articles.find((a) => a.slug === slug) || null;
}

/**
 * Get related articles from static content
 */
export function getStaticRelatedArticles(
  content: StaticHelpContent,
  relatedSlugs: string[]
): Array<HelpArticle & { "slug": string; "title": string; "subtitle": string; "category": string }> {
  const slugSet = new Set(relatedSlugs);
  return content.articles
    .filter((a) => slugSet.has(a.slug))
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      subtitle: a.subtitle ?? null,
      category: a.category,
    }));
}

/**
 * Clear cached content (useful for testing or forced reload)
 */
export function clearStaticHelpCache(): void {
  cachedContent = null;
  loadAttempted = false;
  loadError = null;
  inFlightLoad = null;
}