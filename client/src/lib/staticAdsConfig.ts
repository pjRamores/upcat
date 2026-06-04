import type { PublicAdsConfig } from "@upcat/shared";

export interface StaticAdsConfig {
    version: number;
    publishedAt: string;
    publishedBy: string;
    meta: {
        adsEnabled: boolean;
        configuredSlots: number;
    };
    config: PublicAdsConfig;
}

let cached: StaticAdsConfig | null = null;
let loadAttempted = false;
let loadError: Error | null = null;
let inFlight: Promise<StaticAdsConfig | null> | null = null;

export async function loadStaticAdsConfig(
    forceReload = false,
): Promise<StaticAdsConfig | null> {
    if (forceReload) {
        cached = null;
        loadAttempted = false;
        loadError = null;
        inFlight = null;
    }

    if (cached) return cached;
    if (loadAttempted && loadError) return null;
    if (inFlight) return inFlight;

    inFlight = async () => {
        try {
            const res = await fetch("/data/ads-config.json", {
                cache: "no-store",
                headers: { Accept: "application/json" },
            });
            if (!res.ok) {
                loadError = new Error(`HTTP ${res.status}`);
                loadAttempted = true;
                return null;
            }

            const data = (await res.json()) as StaticAdsConfig;
            if (typeof data.version !== "number" || typeof data.config !== "object" || data.config === null) {
                throw new Error("Invalid ads-config.json structure");
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

export function hasUsableStaticAdsConfig(
    data: StaticAdsConfig | null,
): data is StaticAdsConfig {
    return data !== null;
}

export function clearStaticAdsConfigCache(): void {
    cached = null;
    loadAttempted = false;
    loadError = null;
    inFlight = null;
}