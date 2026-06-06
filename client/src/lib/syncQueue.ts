/**
 * Durable client-side sync queue for exam answers.
 *
 * Stores pending answer operations in localStorage so they survive page
 * refreshes, tab closes, and brief offline periods. When the browser
 * comes back online, the queue is automatically flushed to the server via
 * the /api/sync/answers endpoint (last-write-wins conflict resolution).
 *
 * Only exam answers are queued here; practice cards use a simpler inline
 * retry because their server response (reveal + rationale) is required
 * before the UI can advance.
 */

import apiClient from "@/lib/api";

const QUEUE_KEY = "upcat.syncq.v1";
const SESSION_ACTION_QUEUE_KEY = "upcat.session-actions.v1";
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE_MS = 2_000;

export interface QueuedAnswer {
    id: string; // uuid-ish unique per entry
    sessionId: string;
    questionId: string;
    answer: "A" | "B" | "C" | "D" | null;
    timeSpent: number;
    answeredAt: string; // ISO timestamp
    retries: number;
    queuedAt: string; // ISO timestamp
}

export interface QueuedSessionAction {
    id: string;
    sessionId: string;
    action: "pause" | "resume";
    at: string; // ISO timestamp of when this action happened on client
    retries: number;
    queuedAt: string; // ISO timestamp of when this action was queued
}

type QueueStore = QueuedAnswer[];
type SessionActionQueueStore = QueuedSessionAction[];

// Persistence helpers

function loadQueue(): QueueStore {
    if (typeof localStorage === "undefined") return [];
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as QueueStore;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveQueue(q: QueueStore): void {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch {
        // localStorage full - trim oldest 20 entries and retry once
        const trimmed = q.slice(-Math.max(0, q.length - 20));
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
        } catch {
            /* accept data loss if storage quota exceeded */
        }
    }
}

function loadSessionActionQueue(): SessionActionQueueStore {
    if (typeof localStorage === "undefined") return [];
    try {
        const raw = localStorage.getItem(SESSION_ACTION_QUEUE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as SessionActionQueueStore;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveSessionActionQueue(q: SessionActionQueueStore): void {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(SESSION_ACTION_QUEUE_KEY, JSON.stringify(q));
    } catch {
        const trimmed = q.slice(-Math.max(0, q.length - 20));
        try {
            localStorage.setItem(SESSION_ACTION_QUEUE_KEY, JSON.stringify(trimmed));
        } catch {
            /* accept data loss if storage quota exceeded */
        }
    }
}

function genId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Enqueue ----------------------------------------
/**
 * Add or update an answer in the durable queue.
 * If an entry with the same sessionId+questionId already exists it is
 * replaced (last write wins locally — answeredAt is used server-side).
 */
export function enqueueAnswer(
    sessionId: string,
    questionId: string,
    answer: "A" | "B" | "C" | "D" | null,
    timeSpent: number,
): void {
    const q = loadQueue();
    const idx = q.findIndex(
        (e) => e.sessionId === sessionId && e.questionId === questionId,
    );
    const entry: QueuedAnswer = {
        id: idx >= 0 ? (q[idx]?.id ?? genId()) : genId(),
        sessionId,
        questionId,
        answer,
        timeSpent,
        answeredAt: new Date().toISOString(),
        retries: 0,
        queuedAt: idx >= 0 ? (q[idx]?.queuedAt ?? new Date().toISOString()) : new Date().toISOString(),
    };
    if (idx >= 0) {
        q[idx] = entry;
    } else {
        q.push(entry);
    }
    saveQueue(q);
}

/** Remove all queued answers and session actions for a given session (after successful submit). */
export function clearSessionQueue(sessionId: string): void {
    const q = loadQueue().filter((e) => e.sessionId !== sessionId);
    saveQueue(q);

    const actions = loadSessionActionQueue().filter((e) => e.sessionId !== sessionId);
    saveSessionActionQueue(actions);
}

/** Return all queued entries for a session. */
export function getSessionQueue(sessionId: string): QueuedAnswer[] {
    return loadQueue().filter((e) => e.sessionId === sessionId);
}

/** How many sessions have pending queued answer or pause/resume actions. */
export function pendingSessionCount(): number {
    const ids = new Set(loadQueue().map((e) => e.sessionId));
    for (const action of loadSessionActionQueue()) {
        ids.add(action.sessionId);
    }
    return ids.size;
}

/**
 * Queue a pause/resume action for later sync.
 * Actions are replayed in queue order with their original client timestamps.
 */
export function enqueueSessionAction(
    sessionId: string,
    action: "pause" | "resume",
    at: string = new Date().toISOString(),
): void {
    const q = loadSessionActionQueue();
    const last = q.length > 0 ? q[q.length - 1] : null;

    if (last && last.sessionId === sessionId && last.action === action) {
        q[q.length - 1] = {
            ...last,
            at,
            queuedAt: new Date().toISOString(),
            retries: 0,
        };
        saveSessionActionQueue(q);
        return;
    }

    q.push({
        id: genId(),
        sessionId,
        action,
        at,
        retries: 0,
        queuedAt: new Date().toISOString(),
    });
    saveSessionActionQueue(q);
}

// --- Flush --------------------------------------------

let flushInProgress = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Cancel any pending retry timer. */
function cancelRetryTimer() {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
}

/**
 * Attempt to send all queued answers for a session to the server.
 * Returns the number of answers accepted by the server (0 on failure).
 */
export async function flushSessionQueue(
    sessionId: string,
    opts: { deviceId?: string } = {},
): Promise<number> {
    const entries = getSessionQueue(sessionId);
    if (entries.length === 0) return 0;

    try {
        const response = await apiClient.post("/sync/answers", {
            sessionId,
            answers: entries.map((e) => ({
                questionId: e.questionId,
                answer: e.answer,
                timeSpent: e.timeSpent,
                answeredAt: e.answeredAt,
            })),
            deviceId: opts.deviceId ?? localStorage.getItem("upcat.deviceId") ?? "web",
            syncedAt: new Date().toISOString(),
        });

        const accepted: number = response.data?.data?.answersAccepted ?? entries.length;

        // Remove successfully sent entries from queue
        const remaining = loadQueue().filter((e) => e.sessionId !== sessionId);
        saveQueue(remaining);
        return accepted;
    } catch {
        // Increment retry counters and drop entries that exceeded max retries
        const q = loadQueue().map((e) => {
            if (e.sessionId !== sessionId) return e;
            return { ...e, retries: e.retries + 1};
        });
        const filtered = q.filter((e) => e.sessionId !== sessionId || e.retries <= MAX_RETRIES);
        saveQueue(filtered);
        return 0;
    }
}

/**
 * Flush queued pause/resume actions for a session in queue order.
 * Returns number of actions successfully replayed.
 */
export async function flushSessionActionQueue(sessionId: string): Promise<number> {
    const entries = loadSessionActionQueue()
        .filter((e) => e.sessionId === sessionId)
        .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));

    if (entries.length === 0) return 0;

    let sent = 0;
    for (const entry of entries) {
        try {
            await apiClient.post(`/exam/${sessionId}/${entry.action}`, {at: entry.at});
            sent += 1;

            const remaining = loadSessionActionQueue().filter((e) => e.id !== entry.id);
            saveSessionActionQueue(remaining)
        } catch {
            const queue = loadSessionActionQueue().map((e) => {
                if (e.id !== entry.id) return e;
                return {...e, retries: e.retries + 1};
            });
            const filtered = queue.filter((e) => e.id !== entry.id || e.retries <= MAX_RETRIES);
            saveSessionActionQueue(filtered);
            break;
        }
    }

    return sent;
}

/**
 * Flush all queued answers across all sessions.
 * Called automatically when the browser comes back online.
 */
export async function flushAllQueues(opts: { deviceId?: string } = {}): Promise<void> {
    if (flushInProgress) return;
    flushInProgress = true;
    cancelRetryTimer();
    try {
        const q = loadQueue();
        const sessionIds = [...new Set(q.map((e) => e.sessionId))];
        await Promise.allSettled(
            sessionIds.map((id) => flushSessionQueue(id, opts)),
        );

        const actionQueue = loadSessionActionQueue();
        const actionSessionIds = [...new Set(actionQueue.map((e) => e.sessionId))];
        await Promise.allSettled(
            actionSessionIds.map((id) => flushSessionActionQueue(id)),
        );

        // Schedule a retry if items remain (some flush failed)
        const remaining = loadQueue();
        const remainingActions = loadSessionActionQueue();
        if (remaining.length > 0 || remainingActions.length > 0) {
            const allRetries = [
                ...remaining.map((e) => e.retries),
                ...remainingActions.map((e) => e.retries),
            ];
            const minRetries = allRetries.length > 0 ? Math.min(...allRetries) : 0;
const delay = RETRY_DELAY_BASE_MS * Math.pow(2, Math.min(minRetries, 5));
retryTimer = setTimeout(() => {
    void flushAllQueues(opts);
}, delay);

} finally {
    flushInProgress = false;
}

// Auto-flush on online

let installed = false;

export function installSyncQueueHooks(): void {
    if (installed || typeof window === "undefined") return;
    installed = true;

    if (navigator.onLine) {
        void flushAllQueues();
    }

    window.addEventListener("online", () => {
        cancelRetryTimer();
        void flushAllQueues();
    });
}