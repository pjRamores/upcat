/**
 * Client-side session recovery manager.
 * Handles two recovery scenarios:
 * 1. **Server-side snapshot** - periodically POSTS the full runtime state to /api/sync/session-snapshot so a snapshot is always available on the server even if the client's sessionStorage was wiped (e.g. private browsing, cross-device continuation).
 * 2. **Status check on re-init** - before trusting a cached local runtime, we check /api/sync/session-status/:id to verify the session is still active and learn of any server-side answer count or timer adjustments (e.g. maintenance extension applied while offline).
 */

import apiClient from "@/lib/api";

const SNAPSHOT_THROTTLE_MS = 30_000; // save to server at most every 30s
const DEVICE_ID_KEY = "upcat.deviceId";

function getDeviceId(): string {
    if (typeof localStorage === "undefined") return "web";
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        try {
            localStorage.setItem(DEVICE_ID_KEY, id);
        } catch {
            /* ignore */
        }
    }
    return id;
}

export interface ServerSessionStatus {
    status: "in_progress" | "completed" | "timeout" | string;
    serverAnswerCount: number;
    lastServerUpdate: string | null;
    timerState: {
        remainingMs: number;
        adjustments: number;
    };
    maintenanceExtension: number | null;
}

export interface SnapshotPayload {
    currentIndex: number;
    totalQuestions: number;
    timeLimit: number;
    startedAt: number | null;
    answeredQuestions: Array<{
        questionId: string;
        answer: "A" | "B" | "C" | "D" | null;
        timeSpent: number;
        answeredAt?: string;
    }>;
    remainingMs?: number;
}

// --- Snapshot throttle tracker --------------------------------------------

const lastSavedAt: Record<string, number> = {};

/**
 * POST a session snapshot to the server. Throttled per sessionId.
 * Silent - never throws; snapshot save is best-effort.
 */
export async function saveSnapshot(
    sessionId: string,
    snapshot: SnapshotPayload,
    sessionType: "mock_exam" | "practice" = "mock_exam",
): Promise<void> {
    const now = Date.now();
    if (now - (lastSavedAt[sessionId] ?? 0) < SNAPSHOT_THROTTLE_MS) return;
    lastSavedAt[sessionId] = now;

    try {
        await apiClient.post("/sync/session-snapshot", {
            sessionId,
            sessionType,
            deviceId: getDeviceId(),
            snapshot,
        });
    } catch {
        // Silent - server snapshot is best-effort; local sessionStorage is fallback
    }
}

/**
 * Immediately save a snapshot bypassing the throttle.
 * Use before submit or on critical checkpoints.
 */
export async function saveSnapshotNow(
    sessionId: string,
    snapshot: SnapshotPayload,
    sessionType: "mock_exam" | "practice" = "mock_exam",
): Promise<void> {
    lastSavedAt[sessionId] = 0; // reset throttle
    await saveSnapshot(sessionId, snapshot, sessionType);
}

// --- Status check ---------------------------------------------------------
/**
 * Check the server-side status of a session.
 * Returns null if the request fails (treat as unknown ./ use local data).
 */
export async function checkServerStatus(
    sessionId: string,
): Promise<ServerSessionStatus | null> {
    try {
        const response = await apiClient.get(`/sync/session-status/${sessionId}`);
        return (response.data?.data as ServerSessionStatus) ?? null;
    } catch {
        return null;
    }
}

// --- Recovery ------------------------------

export interface RecoveredSession {
    mergedAnsweredQuestions: Array<{
        questionId: string;
        answer: string | null;
        answeredAt: Date;
        timeSpent: number;
    }>;
    timerAdjustments: number;
}

/**
 * Ask the server to merge a local offline snapshot with the authoritative
 * server state and return the reconciled answer set.
 */
export async function recoverSession(
    sessionId: string,
    localSnapshot: SnapshotPayload,
): Promise<RecoveredSession | null> {
    try {
        const response = await apiClient.post("/sync/recover-session", {
            sessionId,
            deviceId: getDeviceId(),
            localSnapshot: {
                answeredQuestions: localSnapshot.answeredQuestions,
                timer: { remainingMs: localSnapshot.remainingMs },
            },
        });
        const data = response.data?.data as {
            recovered: boolean;
            mergedState?: {
                answeredQuestions: RecoveredSession["mergedAnsweredQuestions"];
            };
            timerAdjustments?: number;
        };
        if (!data?.recovered) return null;
        return {
            mergedAnsweredQuestions: data.mergedState?.answeredQuestions ?? [],
            timerAdjustments: data.timerAdjustments ?? 0,
        };
    } catch {
        return null;
    }
}

/**
 * Submit a completed offline session (all answers + completion) to the server.
 */
export async function submitOfflineSession(
    sessionId: string,
    allAnswers: SnapshotPayload["answeredQuestions"],
    completedAt: string,
    totalOfflineMs: number,
): Promise<boolean> {
    try {
        await apiClient.post("/sync/complete-offline-session", {
            sessionId,
            allAnswers,
            completedAt,
            offlineData: { totalOfflineMs },
        });
        return true;
    } catch {
        return false;
    }
}