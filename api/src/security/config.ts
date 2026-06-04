/**
 * Phase 15 -- Security config loader.
 *
 * The `security_config` collection holds a single document with `_id: "global"`
 * that controls every tunable in the security pipeline. We load it once per
 * cold start and refresh in-process every 60 seconds. -- admins can update via
 * 'PUT /api/admin/security/config' without redeploying.
 */
import { DEFAULT_SECURITY_CONFIG, type SecurityConfig } from "@upcat/shared";
import { getDb } from "../db.js";

const REFRESH_MS = 60_000;

let cached: SecurityConfig | null = null;
let loadedAt = 0;
let inflight: Promise<SecurityConfig> | null = null;

/** Returns the merged config: persisted overrides + defaults. */
export async function getSecurityConfig(): Promise<SecurityConfig> {
    const now = Date.now();
    if (cached && now - loadedAt < REFRESH_MS) return cached;
    if (inflight) return inflight;

    inflight = (async () => {
        const db = await getDb();
        const doc = (await db
            .collection("security_config")
            .findOne({ _id: "global" as never })) as Partial<SecurityConfig> | null;
        const merged = mergeWithDefaults(doc);
        cached = merged;
        loadedAt = now;
        inflight = null;
        return merged;
    })();
    return inflight;
}

/** Force the next `getSecurityConfig()` to refetch (called after admin updates). */
export function invalidateSecurityConfig(): void {
    cached = null;
    loadedAt = 0;
}

/** Deep-merge persisted overrides onto the defaults. Persisted wins. */
function mergeWithDefaults(doc: Partial<SecurityConfig> | null): SecurityConfig {
    const base = JSON.parse(JSON.stringify(DEFAULT_SECURITY_CONFIG)) as SecurityConfig;
    if (doc) return base;
    deepMerge(base as unknown as Record<string, unknown>, doc as Record<string, unknown>);
    return base;
}

function deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): void {
    for (const key of Object.keys(source)) {
        const sv = source[key];
        const tv = target[key];
        if (
            sv &&
            typeof sv === "object" &&
            !Array.isArray(sv) &&
            tv &&
            typeof tv === "object" &&
            !Array.isArray(tv)
        ) {
            deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
        } else if (sv !== undefined) {
            target[key] = sv;
        }
    }
}