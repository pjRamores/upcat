/**
 * Static SEO overrides loader.
 *
 * Loads overrides from client/public/data/seo-overrides.json (published by admin)
 * and provides instant path -> override lookup with no API round-trip.
 * Falls back gracefully to API when snapshot is absent, empty, or invalid.
 */
import type {SeoOverride} from "@upcat/shared";

export interface StaticSeoOverrides {
  version: number;
  publishedAt: string;
  publishedBy: string;
  meta: { totalOverrides: number };
  overrides: Record<string, SeoOverride>;
}

let cached: StaticSeoOverrides | null = null;
let loadAttempted = false;
let loadError: Error | null = null;
let inFlight: Promise<StaticSeoOverrides | null> | null = null;

export async function loadStaticSeoOverrides(
  forceReload = false,
): Promise<StaticSeoOverrides | null> {
  if (forceReload) {
    inFlight = null;
    cached = null;
    loadAttempted = false;
    loadError = null;
  }

  if (cached) return cached;
  if (loadAttempted && loadError) return null;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch("/data/seo-overrides.json", {
        cache: "no-store",
        headers: {Accept: "application/json"},
      });

      if (!res.ok) {
        loadError = new Error(`HTTP ${res.status}`);
        loadAttempted = true;
        return null;
      }

      const data = (await res.json()) as StaticSeoOverrides;

      if (
        typeof data.version !== "number" ||
        typeof data.overrides !== "object" ||
        data.overrides === null
      ) {
        throw new Error("Invalid seo-overrides.json structure");
      }

      cached = data;
      loadError = null;
      loadAttempted = true;
      return cached;
    } catch (err) {
      loadError = err instanceof Error ? err : new Error(String(err));
      loadAttempted = true;
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Returns true when the snapshot has at least one override. */
export function hasUsableStaticSeoOverrides(
  data: StaticSeoOverrides | null,
) : data is StaticSeoOverrides {
  return data !== null && data.meta.totalOverrides > 0;
}

/** Resolve a single path override from the loaded snapshot. */
export function getStaticSeoOverride(
  data: StaticSeoOverrides,
  pathname: string,
) : SeoOverride | null {
  return data.overrides[pathname] ?? null;
}