import type {ContextualHelpPoint, OnboardingFlow, } from "@upcat/shared";
import {API_ROUTES} from "@upcat/shared";
import apiClient from "@/lib/api";
import {
  getStaticArticle,
  getStaticCategories,
  getStaticRelatedArticles,
  loadStaticHelpContent,
  searchStaticArticles,
} from "./staticHelpContent";

function hasUsableStaticContent(content: { categories?: unknown[]; articles?: unknown[] }): boolean {
  const categoryCount = Array.isArray(content.categories)? content.categories.length : 0;
  const articleCount = Array.isArray(content.articles)? content.articles.length : 0;
  return categoryCount > 0 || articleCount > 0;
}

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const data = await promise;
  return data.data;
}

// Onboarding check cache helpers
const ONBOARDING_CACHE_KEY = "upcat.help.onboarding.check.v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ONBOARDING_ALLOWED_EXACT = new Set([
  "/",
  "/dashboard",
  "/practice",
  "/practice-test/configure",
  "/profile",
  "/results",
]);

const ONBOARDING_ALLOWED_PREFIXES = [
  "/mock-exam",
  "/study-plan",
];

function shouldCheckOnboardingForPage(page: string): boolean {
  if (ONBOARDING_ALLOWED_EXACT.has(page)) return true;
  return ONBOARDING_ALLOWED_PREFIXES.some((prefix) => page.startsWith(prefix));
}

interface OnboardingCheckCache {
  [userId: string]: {
    [page: string]: {
      at: number;
      data: { items: Array<{ flowId: string; triggerCondition: string; reason: string }> };
    };
  };
}

function readOnboardingCheckCache(): OnboardingCheckCache {
  try {
    const cached = localStorage.getItem(ONBOARDING_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function writeOnboardingCheckCache(cache: OnboardingCheckCache): void {
  try {
    localStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}

function normalizePage(page: string): string {
  return page.startsWith("/") ? page : `${page}`;
}

async function getCurrentUserId(): Promise<string> | null {
  try {
    const authModule = await import("@/stores/authStore");
    const user = authModule.useAuthStore.getState().user as { _id?: string; id?: string } | null;
    return user?._id ?? user?.id ?? null;
  } catch {
    return null;
  }
}

function getCachedOnboardingCheck(
  userId: string,
  page: string,
): { items: Array<{ flowId: string; triggerCondition: string; reason: string }> } | null {
  const cache = readOnboardingCheckCache();
  const normalizedPage = normalizePage(page);
  const userCache = cache[userId];
  if (!userCache) return null;

  const entry = userCache[normalizedPage];
  if (!entry) return null;

  // Check if cache is still valid (within TTL)
  const age = Date.now() - entry.at;
  if (age > CACHE_TTL_MS) {
    // Cache expired, remove it
    delete userCache[normalizedPage];
    if (Object.keys(userCache).length === 0) {
      delete cache[userId];
    }
  }
}
writeOnboardingCheckCache(cache);
return null;
}

return entry.data;
}

function setCachedOnboardingCheck(
  userId: string,
  page: string,
  data: { items: Array<{ flowId: string; triggerCondition: string; reason: string }}>,
) : void {
  const cache = readOnboardingCheckCache();
  const normalizedPage = normalizePage(page);
  if (!cache[userId]) {
    cache[userId] = {};
  }
  cache[userId][normalizedPage] = {
    at: Date.now(),
    data,
  };
  writeOnboardingCheckCache(cache);
}

export async function clearCachedOnboardingChecks(page?: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const cache = readOnboardingCheckCache();
  if (!cache[userId]) return;

  if (page) {
    const normalizedPage = normalizePage(page);
    delete cache[userId][normalizedPage];
    if (Object.keys(cache[userId]).length === 0) {
      delete cache[userId];
    }
  } else {
    delete cache[userId];
  }

  writeOnboardingCheckCache(cache);
}

export { setCachedOnboardingCheck };

export async function prewarmOnboardingCheck(page: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const normalizedPage = normalizePage(page);
    // Check if already cached
    if (getCachedOnboardingCheck(userId, normalizedPage)) return;

    // Fetch and cache
    const response = await helpApi.checkOnboarding(normalizedPage);
    setCachedOnboardingCheck(userId, normalizedPage, response);
  } catch {
    // Silently fail if prewarm doesn't work
  }
}

export const helpApi = {
  /**
   * List articles from static snapshot only.
   */
  listArticles: async (params: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number
  }) => {
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;

    // Try to use static content first
    const staticContent = await loadStaticHelpContent();
    if (staticContent && hasUsableStaticContent(staticContent)) {
      try {
        let articles = staticContent.articles;

        // Filter by category if specified
        if (params.category) {
          articles = articles.filter((a) => a.category === params.category);
        }

        // Filter by search if specified (only if no category to avoid complexity)
        if (params.search && !params.category) {
          const searchResults = searchStaticArticles(staticContent, params.search, 1000);
          const foundSlugs = new Set(searchResults.map((r) => r.slug));
          articles = articles.filter((a) => foundSlugs.has(a.slug));
        }

        const total = articles.length;
        const skip = (page - 1) * limit;
        const paginatedItems = articles.slice(skip, skip + limit);

        return {
          items: paginatedItems.map((a) => ({
            slug: a.slug,
            title: a.title,
            subtitle: a.subtitle,
            category: a.category,
quickFacts: (a as any).quickFacts || null,
faqs: (a as any).faqs || null,
lastUpdatedAt: (a as any).lastUpdatedAt,
estimatedReadingMinutes: a.estimatedReadingMinutes,
})),
total,
page,
limit,
categories: getStaticCategories(staticContent),
};
catch (error) {
console.warn("[HelpContent] Static list failed", error);
}
else if (staticContent) {
console.info("[HelpContent] Static snapshot is empty for listArticles");
}

return {
items: [],
total: 0,
page,
limit,
categories: [],
};
},

/**
* Get article detail from static snapshot only.
*/
getArticle: async (slug: string) => {
// Try static content first
const staticContent = await loadStaticHelpContent();
if (staticContent) {
try {
const article = getStaticArticle(staticContent, slug);
if (article) {
const relatedArticles = article.relatedArticles
? getStaticRelatedArticles(staticContent, article.relatedArticles)
: [];
return {
article,
relatedArticles,
};
}
catch (error) {
console.warn("[HelpContent] Static article detail failed", error);
}
}

throw new Error("Static help content unavailable");
},

/**
* Get categories from static snapshot only.
*/
categories: async () => {
// Try static content first
const staticContent = await loadStaticHelpContent();
if (staticContent && hasUsableStaticContent(staticContent)) {
try {
return staticContent.categories.map((cat) => ({
category: cat.category,
name: cat.name,
description: cat.description,
icon: cat.icon,
})));
catch (error) {
console.warn("[HelpContent] Static categories failed", error);
}
else if (staticContent) {
console.info("[HelpContent] Static snapshot is empty for categories");
}
return [];
},

feedback: (slug: string, payload: {helpful: boolean; comment?: string}) =>
unwrap<{recorded: true}>(apiClient.post(API_ROUTES.HELP.ARTICLE_FEEDBACK(slug), payload)),
/

/**
* Search static snapshot only.
*/
search: async (q: string) => {
// Try static content first
const staticContent = await loadStaticHelpContent();
if (staticContent && hasUsableStaticContent(staticContent)) {
try {
const items = searchStaticArticles(staticContent, q);
return {items};
} catch (error) {
console.warn("[HelpContent] Static search failed", error);
}
else if (staticContent) {
console.info("[HelpContent] Static snapshot is empty for search");
}
return {items: []};
},

contextual: (page: string) =>
unwrap<{items: ContextualHelpPoint[]; isNewUser: boolean}}(
apiClient.get(API_ROUTES.HELP.CONTEXTUAL, {params: {page}}),
dismissContextual: (id: string) =>
unwrap<{ dismissed: true }>(apiClient.post(API_ROUTES.HELP.CONTEXTUAL_DISMISS(id))),

onboardingFlow: (flowId: string, params: { page?: string; manual?: boolean }) =>
unwrap<{ flow: OnboardingFlow }>(
apiClient.get(API_ROUTES.HELP.ONBOARDING(flowId), {
params: {
page: params.page,
manual: params.manual ? "1" : undefined,
},
}),

completeOnboarding: (flowId: string, payload: { completed: boolean; stepsCompleted: number }) =>
unwrap<{ recorded: true }>(apiClient.post(API_ROUTES.HELP.ONBOARDING_COMPLETE(flowId), payload)),

skipOnboarding: (flowId: string, payload: { stepsCompleted: number }) =>
unwrap<{ skipped: true }>(apiClient.post(API_ROUTES.HELP.ONBOARDING_SKIP(flowId), payload)),

checkOnboarding: async (page: string) => {
const normalizedPage = normalizePage(page);
if (!shouldCheckOnboardingForPage(normalizedPage)) {
return {items: []};
}

const userId = await getCurrentUserId();
if (!userId) {
// Skip network call on unauthenticated pages like /login.
return {items: []};
}

// Check cache first
const cached = getCachedOnboardingCheck(userId, normalizedPage);
if (cached) {
return cached;
}

// Fetch from API
const response = await unwrap<{ items: Array<{ flowId: string; triggerCondition: string; reason: string } }>(
apiClient.get(API_ROUTES.HELP.ONBOARDING_CHECK, {params: {page: normalizedPage}}),
);

// Cache the response
setCachedOnboardingCheck(userId, normalizedPage, response);

return response;
},

updatePreferences: (payload: {
showTooltips?: boolean;
showOnboarding?: boolean;
reducedHelp?: boolean;
resetDismissed?: boolean
}) => unwrap<{ updated: true }>(apiClient.put(API_ROUTES.HELP.PREFERENCES, payload)),
};