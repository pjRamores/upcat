import { useLocation } from "react-router-dom";
import SEOHead, { getPageSeo } from "@/components/Seo";
import { breadcrumbSchema, DEFAULT_SITE_URL } from "@upcat/shared";

const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? DEFAULT_SITE_URL;

interface RoutedSeoProps {
  /** Extra JSON-LD blocks to append to the breadcrumb schema (e.g., FAQ). */
  extraStructuredData?: object | object[];
  /** Override the title from the registry (e.g., for dynamic pages). */
  title?: string;
  /** Override the description from the registry. */
  description?: string;
  /** Override breadcrumb generation (skip auto-generation). */
  breadcrumbs?: Array<{ name: string; path: string }> | null;
}

/**
 * Drop-in SEO component that auto-pulls title/.description/.keywords/
 * indexable flag from the shared `PAGE_SEO` registry based on the current
 * pathname, attaches a BreadcrumbList JSON-LD when breadcrumbs are
 * configured, and lets callers append page-specific structured data.
 */
export default function RoutedSeo({
  extraStructuredData,
  title,
  description,
  breadcrumbs,
}: RoutedSeoProps = {}) {
  const location = useLocation();
  const cfg = getPageSeo(location.pathname);

  const effectiveTitle = title ?? cfg?.title ?? "UPCAT Simulator";
  const effectiveDescription = description ?? cfg?.description;
  const trail = breadcrumbs === null ? null : (breadcrumbs ?? cfg?.breadcrumbs ?? null);

  const structured: object[] = [];
  if (trail && trail.length > 0) {
    structured.push(breadcrumbSchema(trail, SITE_URL));
  }
  if (Array.isArray(extraStructuredData)) {
    structured.push(...extraStructuredData);
  } else if (extraStructuredData) {
    structured.push(extraStructuredData);
  }

  return (
    <SEOHead
      title={effectiveTitle}
      description={effectiveDescription}
      keywords={cfg?.keywords}
      bareTitle={cfg?.bareTitle ?? true}
      noIndex={!cfg?.indexable}
      ogImage={cfg?.ogImage}
      structuredData={(structured.length > 0 ? structured : null)
    />
  );
}