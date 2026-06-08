import {useEffect, useState} from "react";
import {Helmet} from "react-helmet-async";
import {useLocation} from "react-router-dom";
import {
    canonicalUrl as buildCanonicalUrl,
    DEFAULT_OG_IMAGE,
    DEFAULT_SITE_URL,
    PAGE_SEO,
    type PageSeoConfig,
    type SeoOverride,
} from "@upcat/shared";
import {getStaticSeoOverride, hasUsableStaticSeoOverrides, loadStaticSeoOverrides,} from "@/lib/staticSeoOverrides";

const SITE_NAME = "UPCAT Simulator";
const DEFAULT_TWITTER_HANDLE = "@upcatsim";

const DEFAULT_DESCRIPTION =
    "Practice for the UP College Admission Test with realistic, timed mock exams across all four subject areas. Track your progress and identify weak areas.";

const SITE_URL =
    (import.meta.env.VITE_SITE_URL as string | undefined) ?? DEFAULT_SITE_URL;

export interface AlternateLanguage {
    lang: string;
    href: string;
}

export interface SEOHeadProps {
    title: string;
    description?: string;
    keywords?: string[];
    /** Override canonical URL -- by default the current path is canonicalized. */
    canonicalUrl?: string;
    ogType?: "website" | "article";
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: "summary" | "summary_large_image";
    /** Set <meta name="robots" content="noindex,nofollow">. */
    noIndex?: boolean;
    /** Backwards-compat alias for `noIndex`. */
    noindex?: boolean;
    /** JSON-LD object -- stringified into one or more <script type="application/ld+json"> tags. */
    structuredData?: object | object[] | null;
    alternateLanguages?: AlternateLanguage[] | null;
    /** Skip the " | UPCAT Simulator" suffix on the document title. */
    bareTitle?: boolean;
    /** Backwards-compat alias for `bareTitle`. */
    bare?: boolean;
    /** Backwards-compat alias for `ogImage`. */
    image?: string;
}

/**
 * Page-level SEO component. Renders all standard meta tags, OG/Twitter
 * card meta, canonical URL, optional JSON-LD, and respects per-path
 * admin overrides (fetched lazily and cached for 5 minutes).
 *
 * Default export is also re-exported as `SEOHead` and as the legacy
 * `Seo` name so older callers keep working.
 */
function SEOHeadImpl({
                         title,
                         description,
                         keywords,
                         canonicalUrl,
                         ogType = "website",
                         ogImage,
                         ogTitle,
                         ogDescription,
                         twitterCard = "summary_large_image",
                         noIndex,
                         noindex,
                         structuredData = null,
                         alternateLanguages = null,
                         bareTitle,
                         bare,
                         image,
                     }: SEOHeadProps) {
    const location = useLocation();
    const override = useSeoOverride(location.pathname);

    const effectiveTitle = override?.title ?? title;
    const effectiveDescription =
        override?.description ?? description ?? DEFAULT_DESCRIPTION;
    const effectiveNoIndex = override?.noIndex ?? noIndex ?? noindex ?? false;
    const effectiveKeywords =
        override?.keywords && override.keywords.length > 0
            ? override.keywords
            : keywords;
    const effectiveOgImage = absoluteUrl(
        override?.ogImage ?? ogImage ?? image ?? DEFAULT_OG_IMAGE,
    );
    const isBare = bareTitle ?? bare ?? false;
    const finalTitle = isBare ? effectiveTitle : `${effectiveTitle} | ${SITE_NAME}`;

    const fullCanonical =
        canonicalUrl ?? buildCanonicalUrl(location.pathname + location.search, SITE_URL);

    const structured = Array.isArray(structuredData)
        ? structuredData
        : structuredData
            ? [structuredData]
            : [];
}

    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={effectiveDescription}/>
            {effectiveKeywords && effectiveKeywords.length > 0 &&
                <meta name="keywords" content={`${effectiveKeywords.join(", ")}`}/>}
            <meta name="robots" content={effectiveNoIndex ? "noindex, nofollow" : "index, follow"}/>
            <link rel="canonical" href={fullCanonical}/>

            {/* Open Graph */}
            <meta property="og:title" content={ogTitle ?? finalTitle}/>
            <meta property="og:description" content={ogDescription ?? effectiveDescription}/>
            <meta property="og:type" content={ogType}/>
            <meta property="og:site_name" content={SITE_NAME}/>
            <meta property="og:url" content={fullCanonical}/>
            <meta property="og:image" content={effectiveOgImage}/>
            <meta property="og:image:width" content="1200"/>
            <meta property="og:image:height" content="630"/>

            {/* Twitter card */}
            <meta name="twitter:card" content={twitterCard}/>
            <meta name="twitter:site" content={DEFAULT_TWITTER_HANDLE}/>
            <meta name="twitter:title" content={ogTitle ?? finalTitle}/>
            <meta name="twitter:description" content={ogDescription ?? effectiveDescription}/>
            <meta name="twitter:image" content={effectiveOgImage}/>

            {/* Alternate languages */}
            {alternateLanguages?.map((alt) => (
                <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.href}/>
            ))}
        </Helmet>
    );

/**
 * Named alias -- preferred name in new code.
 */
export const SEOHead = SEOHeadImpl;
/** Backwards-compat name kept for callers that did `import Seo from ...` */
export const Seo = SEOHeadImpl;
export default SEOHeadImpl;

/**
 * Helpers
 */

/**
 * Resolve a possibly-relative URL against the site origin.
 */
function absoluteUrl(input: string | undefined): string {
    if (!input) return SITE_URL.replace(/\/\+$/, "") + DEFAULT_OG_IMAGE;
    if (/^https?:\/\/i\.test(input)) return input;
        const base = SITE_URL.replace(/\/\+$/, "");
    const path = input.startsWith("/") ? input : "/" + input;
    return base + path;
}

/**
 * Look up the matching page config (literal or dynamic-pattern match).
 */
export function getPageSeo(pathname: string): PageSeoConfig | null {
    if (PAGE_SEO[pathname]) return PAGE_SEO[pathname];
    for (const cfg of Object.values(PAGE_SEO)) {
        if (!cfg.path.includes(":")) continue;
        const regex = new RegExp("^" + cfg.path.replace(/:[^/]+/g, "[^/]+") + "$");
        if (regex.test(pathname)) return cfg;
    }
    return null;
}

/**
 * Admin override fetcher
 */

interface OverrideCacheEntry {
    value: SeoOverride | null;
    fetchedAt: number;
}

const OVERRIDE_TTL_MS = 5 * 60 * 1000;
const overrideCache = new Map<string, OverrideCacheEntry>();
const inflight = new Map<string, Promise<SeoOverride | null>>();

/**
 * Warm the static snapshot once on first use (singleton fetch).
 */
let staticSnapshotReady: Promise<void> | null = null;

function warmStaticSnapshot(): Promise<void> {
    if (!staticSnapshotReady) {
        staticSnapshotReady = loadStaticSeoOverrides().then(() => undefined);
    }
    return staticSnapshotReady;
}

function useSeoOverride(pathname: string): SeoOverride | null {
    const [override, setOverride] = useState<SeoOverride | null>(() => {
        const cached = overrideCache.get(pathname);
        return cached && Date.now() - cached.fetchedAt < OVERRIDE_TTL_MS
            ? cached.value
            : null;
    });
}

let cancelled = false;

const cached = overrideCache.get(pathname);
if (cached && Date.now() - cached.fetchedAt < OVERRIDE_TTL_MS) {
    setOverride(cached.value);
    return;
}

let promise = inflight.get(pathname);
if (!promise) {
    promise = warmStaticSnapshot().then(async () => {
        // Try static snapshot first
        const snapshot = await loadStaticSeoOverrides();
        if (hasUsableStaticSeoOverrides(snapshot)) {
            return getStaticSeoOverride(snapshot, pathname);
        }
        return null;
    });
    inflight.set(pathname, promise);
    void promise.finally(() => inflight.delete(pathname));
}

void promise.then((value) => {
    overrideCache.set(pathname, {value, fetchedAt: Date.now()});
    if (!cancelled) setOverride(value);
});

return () => {
    cancelled = true;
};
},
[pathname]
)
;

return override;
}