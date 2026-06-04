import type { PublicAuthProviders, SocialProvider } from "@upcat/shared";
import { SOCIAL_PROVIDERS } from "@upcat/shared";

export interface StaticAuthProviders {
    version: number;
    publishedAt: string;
    publishedBy: string;
    meta: {
        enabledProviders: number;
    };
    providers: PublicAuthProviders;
}

let cached: StaticAuthProviders | null = null;
let loadAttempted = false;
let loadError: Error | null = null;
let inFlight: Promise<StaticAuthProviders | null> | null = null;

export async function loadStaticAuthProviders(
    forceReload = false,
): Promise<StaticAuthProviders | null> {
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
            const res = await fetch("/data/auth-providers.json", {
                cache: "no-store",
                headers: { Accept: "application/json" },
            });
            if (!res.ok) {
                loadError = new Error(`HTTP ${res.status}`);
                loadAttempted = true;
                return null;
            }

            const data = (await res.json()) as StaticAuthProviders;
            if (typeof data.version !== "number" || typeof data.providers !== "object" || data.providers === null) {
                throw new Error("Invalid auth-providers.json structure");
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

export function hasUsableStaticAuthProviders(
    data: StaticAuthProviders | null,
): data is StaticAuthProviders {
    if (!data) return false;
    for (const p of SOCIAL_PROVIDERS as readonly SocialProvider[]) {
        if (!data.providers[p]) return false;
    }
    return true;
}

export function clearStaticAuthProvidersCache(): void {
    cached = null;
    loadAttempted = false;
    loadError = null;
    inFlight = null;
}