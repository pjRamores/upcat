import { readPersistedToken } from "@/lib/authPersistence";
import { getDeviceFingerprint } from "@/lib/fingerprint";

type ErrorSeverity = "warn" | "error";

interface ClientErrorPayload {
    message: string;
    stack?: string | null;
    componentStack?: string | null;
    tags?: string[];
    metadata?: Record<string, unknown> | null;
    severity?: ErrorSeverity;
}

const MAX_REPORTS_PER_SESSION = 40;
const DEDUPE_WINDOW_MS = 30_000;
const RECENT_ERRORS = new Map<string, number>();
let sentCount = 0;
let listenersInstalled = false;

function isRateLimited(): boolean {
    return sentCount >= MAX_REPORTS_PER_SESSION;
}

function baseUrl(): string {
    return import.meta.env.VITE_API_URL || "/api";
}

function now(): number {
    return Date.now();
}

function keyFor(message: string, stack?: string | null | undefined): string {
    return `${message.slice(0, 300)}|${(stack || "").slice(0, 500)}`;
}

function isDuplicateWithinWindow(dedupeKey: string, currentTs: number): boolean {
    cleanupRecentErrors(currentTs);
    const lastTs = RECENT_ERRORS.get(dedupeKey);
    if (lastTs && currentTs - lastTs < DEDUPE_WINDOW_MS) return true;
    RECENT_ERRORS.set(dedupeKey, currentTs);
    return false;
}

function cleanupRecentErrors(currentTs: number) {
    for (const [k, ts] of RECENT_ERRORS.entries()) {
        if (currentTs - ts > DEDUPE_WINDOW_MS) RECENT_ERRORS.delete(k);
    }
}

function shouldIgnoreMessage(message: string): boolean {
    const m = message.toLowerCase();
    return (
        m.includes("resizeobserver.loop.limit.exceeded") ||
        m.includes("script.error") ||
        m.includes("network.error")
    );
}

async function postClientError(payload: ClientErrorPayload): Promise<void> {
    if (isRateLimited()) return;
    if (!payload.message || shouldIgnoreMessage(payload.message)) return;

    const currentTs = now();
    const dedupeKey = keyFor(payload.message, payload.stack);
    if (isDuplicateWithinWindow(dedupeKey, currentTs)) return;
    sentCount += 1;

    const token = readPersistedToken();
    let fingerprint: string | null = null;
    try {
        fingerprint = await getDeviceFingerprint();
    } catch {
        fingerprint = null;
    }

    const body = {
        message: payload.message,
        stack: payload.stack ?? null,
        componentStack: payload.componentStack ?? null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        tags: payload.tags ?? ["global"],
        severity: payload.severity ?? "error",
        metadata: payload.metadata ?? null,
    };

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (fingerprint) headers["X-Device-Fingerprint"] = fingerprint;

    try {
        await fetch(`${baseUrl()}/monitoring/client-errors`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            keepalive: true,
        });
    } catch {
        // Swallow to avoid recursive error loops in global handlers.
    }
}
export function reportClientError(payload: ClientErrorPayload): void {
    postClientError(payload);
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message || error.name;
    if (typeof error === "string") return error;
    try {
        return JSON.stringify(error);
    } catch {
        return "Unknown unhandled rejection";
    }
}

export function installGlobalErrorTracking(): void {
    if (listenersInstalled) return;
    listenersInstalled = true;

    window.addEventListener("error", (event) => {
        const err = event.error as Error | undefined;
        reportClientError({
            message: err?.message || event.message || "Unhandled browser error",
            stack: err?.stack ?? null,
            tags: ["global-error"],
            metadata: {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            },
            severity: "error",
        });
    });

    window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason as unknown;
        const message = toErrorMessage(reason);
        const stack = reason instanceof Error ? reason.stack : null;

        reportClientError({
            message,
            stack,
            tags: ["unhandled-rejection"],
            metadata: {
                reasonType: typeof reason,
            },
            severity: "error",
        });
    });
}

export const __clientErrorTrackingTestOnly = {
    keyFor,
    isDuplicateWithinWindow,
    isRateLimited,
    shouldIgnoreMessage,
    getSentCount: () => sentCount,
    setSentCount: (next: number) => {
        sentCount = Math.max(0, Math.floor(next));
    },
    resetState: () => {
        RECENT_ERRORS.clear();
        sentCount = 0;
        listenersInstalled = false;
    },
    constants: {
        MAX_REPORTS_PER_SESSION,
        DEDUPE_WINDOW_MS,
    },
};