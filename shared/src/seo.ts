/**
 * SEO configuration shared between the client (rendering <SEOHead />)
 * and the server (sitemap generation, structured data, redirects).
 *
 * The page registry below is the single source of truth for:
 * - Title / description / keywords / OG image
 * - Whether the page is indexable (drives robots + sitemap inclusion)
 * - Sitemap priority and changefreq
 * - Breadcrumb trail (used to render BreadcrumbList JSON-LD)
 */

/**
 * Public site origin. Build-time 'SITE_URL' env var overrides this on both
 * the client (via Vite `import.meta.env.VITE_SITE_URL`) and the server.
 * Never include a trailing slash.
 */
export const DEFAULT_SITE_URL = "https://www.upcatsimulator.com";

/** Default Open Graph image (1200x630). */
export const DEFAULT_OG_IMAGE = "/og/default-card.png";

export type SitemapChangeFreq =
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";

export interface PageSeoConfig {
    /** Route path. Dynamic segments use ":id" syntax (excluded from sitemap). */
    path: string;
    /** Page <title> (without the "- | UPCAT Simulator" suffix unless `bareTitle`). */
    title: string;
    /** Add this exact title without appending the site suffix. */
    bareTitle?: boolean;
    description: string;
    keywords?: string[];
    /** Whether crawlers should index this page (and whether to include in sitemap). */
    indexable: boolean;
    /** Sitemap weight (0.0-1.0). Ignored if `indexable` is false. */
    priority?: number;
    changefreq?: SitemapChangeFreq;
    /** Optional OG image override (relative path or absolute URL). */
    ogImage?: string;
    /** Breadcrumb trail; leftmost entry is "Home". */
    breadcrumbs?: Array<{ name: string; path: string }>;
}

/** --- Page registry ------------------------------------------ */

const SITE_SUFFIX = "- | UPCAT Simulator";

export const PAGE_SEO: Record<string, PageSeoConfig> = {
    "/": {
        path: "/",
        title: "UPCAT Simulator -- Free Practice Exams for UP College Admission Test",
        bareTitle: true,
        description: "Prepare for the UPCAT with thousands of realistic practice questions. Track your progress, identify weak areas, and boost your confidence. Free to start.",
        keywords: [
            "UPCAT reviewer",
            "UPCAT practice test",
            "UPCAT simulator",
            "UPCAT online review",
            "free UPCAT reviewer online",
            "UP admission test reviewer",
        ],
        indexable: true,
        priority: 1.0,
        changefreq: "daily",
    },
    "/login": {
        path: "/login",
        title: "Login" + SITE_SUFFIX,
        bareTitle: true,
        description: "Log in to your UPCAT Simulator account to continue practicing for the UP College Admission Test.",
        indexable: true,
        priority: 0.5,
        changefreq: "monthly",
        breadcrumbs: [{ name: "Home", path: "/" }, { name: "Login", path: "/login" }],
    },
    "/register": {
        path: "/register",
        title: "Create Account | UPCAT Simulator -- Start Practicing Free",
        bareTitle: true,
        description: "Sign up for free and get instant access to UPCAT practice exams, mock tests, and detailed performance analytics.",
        indexable: true,
        priority: 0.8,
        changefreq: "monthly",
        breadcrumbs: [{ name: "Home", path: "/" }, { name: "Create Account", path: "/register" }],
    },
    "/practice": {
        path: "/practice",
        title: "Practice Test | UPCAT Simulator -- Customize Your Review",
        bareTitle: true,
        description:
"Configure-your-own-UPCAT-practice-test.-Choose-subjects,-topics,-difficulty,-and-timing.-Learn-at-your-own-pace-with-instant-feedback.",
keywords: ["UPCAT-practice-test","UPCAT-sample-questions","UPCAT-review"],
indexable: true,
priority: 0.9,
changefreq: "weekly",
breadcrumbs: [
    {name: "Home", path: "/"},
    {name: "Practice-Test", path: "/practice"},
],
},
"/leaderboard": {
    path: "leaderboard",
    title: "Leaderboard | UPCAT-Simulator - Top UPCAT Reviewers",
    bareTitle: true,
    description: "See who's leading the pack. Compare your scores with thousands of UPCAT reviewees and climb the rankings.",
    indexable: true,
    priority: 0.6,
    changefreq: "daily",
    breadcrumbs: [
        {name: "Home", path: "/"},
        {name: "Leaderboard", path: "/leaderboard"},
    ],
},
"/terms": {
    path: "/terms",
    title: "Terms and Conditions" + SITE_SUFFIX,
    bareTitle: true,
    description: "Read the terms and conditions for using UPCAT Simulator, our free UPCAT practice platform.",
    indexable: true,
    priority: 0.4,
    changefreq: "monthly",
    breadcrumbs: [
        {name: "Home", path: "/"},
        {name: "Terms and Conditions", path: "/terms"},
    ],
},
"/privacy": {
    path: "/privacy",
    title: "Privacy Policy" + SITE_SUFFIX,
    bareTitle: true,
    description: "Learn how UPCAT Simulator protects your data and your privacy while you prepare for the UPCAT.",
    indexable: true,
    priority: 0.4,
    changefreq: "monthly",
    breadcrumbs: [
        {name: "Home", path: "/"},
        {name: "Privacy Policy", path: "/privacy"},
    ],
},
"/contact": {
    path: "/contact",
    title: "Contact Us" + SITE_SUFFIX,
    bareTitle: true,
    description: "Get in touch with the UPCAT Simulator team. Questions, bug reports, and partnerships welcome.",
    indexable: true,
    priority: 0.4,
    changefreq: "monthly",
    breadcrumbs: [
        {name: "Home", path: "/"},
        {name: "Contact", path: "/contact"},
    ],
},
/* Subject area landing pages - SEO content depth. */
"/subjects/mathematics": {
    path: "/subjects/mathematics",
    title: "UPCAT Mathematics Review & Practice" + SITE_SUFFIX,
    bareTitle: true,
    description: "Master UPCAT Mathematics with focused practice on arithmetic, algebra, geometry, and trigonometry. Solve realistic sample questions with detailed solutions.",
    keywords: [
        "UPCAT math practice questions with answers",
        "UPCAT math reviewer",
        "UPCAT algebra",
        "UPCAT geometry",
    ],
    indexable: true,
    priority: 0.8,
    changefreq: "weekly",
    breadcrumbs: [
        {name: "Home", path: "/"},
        {name: "Subjects", path: "/"},
        {name: "Mathematics", path: "/subjects/mathematics"},
    ],
},
"/subjects/science": {
    path: "/subjects/science",
    title: "UPCAT Science Review & Practice" + SITE_SUFFIX,
    bareTitle: true,
    description: "Strengthen your UPCAT Science score with biology, chemistry, physics, and earth science practice questions and scenario problems.",
    keywords: ["UPCAT science reviewer", "UPCAT biology", "UPCAT physics"],
    indexable: true,
    priority: 0.8,
    changefreq: "weekly",
    breadcrumbs: [
        {name: "Home", path: "/"},
        {name: "Subjects", path: "/"},
        {name: "Science", path: "/subjects/science"},
    ],
},
    "/subjects/language-proficiency": {
        path: "/subjects/language-proficiency",
        title: "UPCAT Language Proficiency Review & Practice" + SITE_SUFFIX,
        bareTitle: true,
        description: "Improve your UPCAT Language Proficiency score with grammar, vocabulary, and usage practice in both English and Filipino.",
        keywords: [
            "UPCAT language proficiency",
            "UPCAT English reviewer",
            "UPCAT Filipino reviewer",
        ],
        indexable: true,
        priority: 0.8,
        changefreq: "weekly",
        breadcrumbs: [
            { name: "Home", path: "/" },
            { name: "Subjects", path: "/" },
            { name: "Language Proficiency", path: "/subjects/language-proficiency" },
        ],
    },
    "/subjects/reading-comprehension": {
        path: "/subjects/reading-comprehension",
        title: "UPCAT Reading Comprehension Review & Practice" + SITE_SUFFIX,
        bareTitle: true,
        description: "Sharpen your critical reading skills for the UPCAT with long-form passages and main idea, inference, and tone questions.",
        keywords: [
            "UPCAT reading comprehension tips",
            "UPCAT passages",
            "UPCAT reviewer",
        ],
        indexable: true,
        priority: 0.8,
        changefreq: "weekly",
        breadcrumbs: [
            { name: "Home", path: "/" },
            { name: "Subjects", path: "/" },
            { name: "Reading Comprehension", path: "/subjects/reading-comprehension" },
        ],
    },
    /* Blog index -- individual post URLs are added dynamically to the sitemap. */
    "/blog": {
        path: "/blog",
        title: "UPCAT Reviewer Blog" + SITE_SUFFIX,
        bareTitle: true,
        description: "Study tips, exam strategies, and announcements from the UPCAT Simulator team.",
        keywords: ["UPCAT blog", "UPCAT tips", "UPCAT reviewer articles"],
        indexable: true,
        priority: 0.6,
        changefreq: "weekly",
        breadcrumbs: [
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
        ],
    },
    /* Private / auth pages -- kept here so SEOHead can read defaults
     * (title / noindex) but they are excluded from the sitemap. */
    "/dashboard": {
        path: "/dashboard",
        title: "Dashboard" + SITE_SUFFIX,
        bareTitle: true,
        description: "Your UPCAT review dashboard.",
        indexable: false,
    },
    "/stats": {
        path: "/stats",
        title: "My Statistics" + SITE_SUFFIX,
        bareTitle: true,
        description: "Track your UPCAT review progress and subject-area accuracy.",
        indexable: false,
    },
    "/profile": {
        path: "/profile",
        title: "My Profile" + SITE_SUFFIX,
        bareTitle: true,
        description: "Manage your UPCAT Simulator profile.",
        indexable: false,
    },
    "/settings": {
        path: "/settings",
        title: "Settings" + SITE_SUFFIX,
        bareTitle: true,
        description: "Account settings.",
        indexable: false,
    },
    "/practice/stats": {
        path: "/practice/stats",
        title: "Practice Statistics" + SITE_SUFFIX,
        bareTitle: true,
        description: "Track your UPCAT practice progress.",
        indexable: false,
    },
    "/exam/:sessionId": {
        path: "/exam/:sessionId",
        title: "Exam in Progress" + SITE_SUFFIX,
        bareTitle: true,
        description: "Active UPCAT mock exam session.",
        indexable: false,
    },
    "/results/:sessionId": {
        path: "/results/:sessionId",
title: "Exam Results" + SITE_SUFFIX,
bareTitle: true,
description: "Your UPCAT mock exam results.",
indexable: false,
},
"/review/:sessionId": {
    path: "review/:sessionId",
    title: "Review Exam" + SITE_SUFFIX,
    bareTitle: true,
    description: "Review your UPCAT mock exam answers.",
    indexable: false,
},
"/practice/:sessionId": {
    path: "practice/:sessionId",
    title: "Practice Session" + SITE_SUFFIX,
    bareTitle: true,
    description: "Active practice session.",
    indexable: false,
},
"/forgot-password": {
    path: "forgot-password",
    title: "Forgot Password" + SITE_SUFFIX,
    bareTitle: true,
    description: "Reset your UPCAT Simulator password.",
    indexable: false,
},
"/reset-password": {
    path: "reset-password",
    title: "Reset Password" + SITE_SUFFIX,
    bareTitle: true,
    description: "Choose a new password for your UPCAT Simulator account.",
    indexable: false,
},
"/verify-email": {
    path: "verify-email",
    title: "Verify Email" + SITE_SUFFIX,
    bareTitle: true,
    description: "Verify your UPCAT Simulator email address.",
    indexable: false,
},
"/recover-account": {
    path: "recover-account",
    title: "Recover Account" + SITE_SUFFIX,
    bareTitle: true,
    description: "Recover access to your UPCAT Simulator account.",
    indexable: false,
},
"/recover-account/reset": {
    path: "recover-account/reset",
    title: "Recover Account -- Reset Password" + SITE_SUFFIX,
    bareTitle: true,
    description: "Reset your UPCAT Simulator password via recovery flow.",
    indexable: false,
},
"/support/guest": {
    path: "support/guest",
    title: "Guest Support" + SITE_SUFFIX,
    bareTitle: true,
    description: "Open a support ticket as a guest.",
    indexable: false,
},
"/support": {
    path: "support",
    title: "Support Tickets" + SITE_SUFFIX,
    bareTitle: true,
    description: "Manage your UPCAT Simulator support tickets.",
    indexable: false,
},
"/account/deletion/confirm": {
    path: "account/deletion/confirm",
    title: "Confirm Account Deletion" + SITE_SUFFIX,
    bareTitle: true,
    description: "Confirm deletion of your UPCAT Simulator account.",
    indexable: false,
};
/**
 * Convenience: ordered list of indexable canonical paths (no dynamic segments).
 */
export function listIndexablePaths(): PageSeoConfig[] {
    return Object.values(PAGE_SEO).filter(
        (cfg) => cfg.indexable && !cfg.path.includes(":"),
    );
}
/**
 * Canonical URL helpers
 */
/**
 * URL params that should NEVER appear in canonical URLs.
 */
export const TRACKING_PARAM_PREFIXES = [
    "utm_",
    "fbclid",
    "gclid",
    "msclkid",
    "mc_eid",
    "mc_cid",
    "ref",
    "ref_src",
];
/**
 * Build a canonical URL: removes trailing slash (except root), strips known
 * tracking params, and resolves against `siteUrl`.
 */
export function canonicalUrl(
    pathAndSearch: string,
siteUrl: string = DEFAULT_SITE_URL,
): string {
    const normalizedSite = siteUrl.replace(/\/+$/, "");
    // Split off the path + query manually so we don't pull in the URL polyfill
    // weirdness around relative URLs in older Node/SSR.
    const [rawPath = "", rawQuery = ""] = pathAndSearch.split("?", 2);
    let path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    // Strip trailing slash unless the path is exactly "/"
    if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");

    // Filter the query string
    let qs = "";
    if (rawQuery) {
        const params = new URLSearchParams(rawQuery);
        for (const key of Array.from(params.keys())) {
            const lower = key.toLowerCase();
            if (TRACKING_PARAM_PREFIXES.some((p) => lower.startsWith(p))) {
                params.delete(key);
            }
        }
        const filtered = params.toString();
        if (filtered) qs = "?" + filtered;
    }
    return normalizedSite + path + qs;
}

/**
 * Database-backed override + redirect types -------------------------
 */
/** A per-path override of the default SEO metadata. */
export interface SeoOverride {
    /** Canonical path key, e.g. "/", "/contact". Includes leading slash, no trailing. */
    path: string;
    title?: string | null;
    description?: string | null;
    keywords?: string[] | null;
    ogImage?: string | null;
    noIndex?: boolean | null;
    updatedAt: string;
    updatedBy?: string | null;
}

/** A 301 / 302 redirect rule managed via the admin SEO panel. */
export interface UrlRedirect {
    _id: string;
    source: string;
    destination: string;
    type: 301 | 302;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}