/**
 * Schema.org·structured-data·builders.
 *
 * Each function returns a plain object that callers JSON-stringify
 * into a <script type="application/ld+json">·tag.
 *
 * Keep these tiny and dependency-free so they can run on both the
 * server (sitemap / SSR) and the client (Helmet·inside·React).
 */

import {DEFAULT_SITE_URL} from "./seo.js";

export interface OrganizationOptions {
  siteUrl?: string;
  logoUrl?: string;
  sameAs?: string[];
}

export function organizationSchema(opts: OrganizationOptions = {}): object {
  const siteUrl = (opts.siteUrl ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "UPCAT·Simulator",
    url: siteUrl,
    logo: opts.logoUrl ?? `${siteUrl}/icons/icon-512.png`,
    description:
      "Free·online·practice·platform·for·the·UP·College·Admission·Test",
    sameAs:
      opts.sameAs ?? [
        "https://facebook.com/upcatsim",
        "https://twitter.com/upcatsim",
      ],
  };
}

export interface WebApplicationOptions {
  siteUrl?: string;
  ratingValue?: number;
  ratingCount?: number;
}

export function webApplicationSchema(opts: WebApplicationOptions = {}): object {
  const siteUrl = (opts.siteUrl ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "UPCAT·Simulator",
    url: siteUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers:
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "PHP",
      },
      aggregateRating:
        {
          "@type": "AggregateRating",
          ratingValue: String(opts.ratingValue ?? 4.7),
          ratingCount: String(opts.ratingCount ?? 1250),
        },
      },
    };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(items: FaqItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
    });
  }
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbSchema(
  items: BreadcrumbItem[],
  siteUrl: string = DEFAULT_SITE_URL,
) : object {
  const normalizedSite = siteUrl.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: normalizedSite + it.path,
    }));
  };
}
export interface CourseSchemaOptions {
  name: string;
  description: string;
  url: string;
  provider?: { name: string; url: string };
}

export function courseSchema(opts: CourseSchemaOptions): object {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: opts.provider ?? {
      "@type": "EducationalOrganization",
      name: "UPCAT Simulator",
      url: DEFAULT_SITE_URL,
    },
  };
}

export interface BlogPostingOptions {
  title: string;
  description: string;
  url: string;
  authorName: string;
  datePublished: string; // ISO
  dateModified?: string; // ISO
  image?: string;
}

export function blogPostingSchema(opts: BlogPostingOptions): object {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    author: { "@type": "Person", name: opts.authorName },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    ...(opts.image ? { image: opts.image } : {}),
    publisher: {
      "@type": "Organization",
      name: "UPCAT Simulator",
      logo: {
        "@type": "ImageObject",
        url: `${DEFAULT_SITE_URL}/icons/icon-512.png`,
      },
    },
  };
}