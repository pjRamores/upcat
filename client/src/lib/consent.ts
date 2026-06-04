/**
 * Persisted consent record helpers. Storage is best-effort -- when localStorage is unavailable (private mode, embed contexts) we silently treat consent as 'unset' and avoid throwing.
 */
import {
    CONSENT_STORAGE_KEY,
    CONSENT_VERSION,
    type ConsentRecord,
    type ConsentState,
    DEFAULT_CONSENT,
} from "@upcat/shared";

function safeStorage(): Storage | null {
    try {
        if (typeof window === "undefined") return null;
        return window.localStorage;
    } catch {
        return null;
    }
}

export function readConsent(): ConsentRecord {
    const store = safeStorage();
    if (!store) return {...DEFAULT_CONSENT};
    try {
        const raw = store.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return {...DEFAULT_CONSENT};
        const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
        if (parsed.version !== CONSENT_VERSION) return {...DEFAULT_CONSENT};
        if (parsed.state !== "granted" && parsed.state !== "denied") return {...DEFAULT_CONSENT};
        return {
            state: parsed.state,
            version: CONSENT_VERSION,
            decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : null,
        };
    } catch {
        return {...DEFAULT_CONSENT};
    }
}

export function writeConsent(state: ConsentState): ConsentRecord {
    const record: ConsentRecord = {
        state,
        version: CONSENT_VERSION,
        decidedAt: state === "unset" ? null : new Date().toISOString(),
    };
    const store = safeStorage();
    if (store) {
        try {
            store.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
        } catch {
            // ignore
        }
    }
    return record;
}

export function clearConsent(): void {
    const store = safeStorage();
    if (!store) return;
    try {
        store.removeItem(CONSENT_STORAGE_KEY);
    } catch {
        // ignore
    }
}