import apiClient from "@/lib/api";
import { readPersistedToken } from "@/lib/authPersistence";

type MaintenanceData = {
    isActive: boolean;
    showBanner?: boolean;
    bannerMessage?: string | null;
    currentWindow?: {
        title?: string;
        scheduledEnd?: string;
    } | null;
} | null;

export interface ResilienceState {
    online: boolean;
    maintenance: MaintenanceData;
    lastHeartbeatAt: string | null;
}

type Listener = (state: ResilienceState) => void;

const listeners = new Set<Listener>();
let initialized = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

let state: ResilienceState = {
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    maintenance: null,
    lastHeartbeatAt: null,
};

function emit() {
    for (const listener of listeners) listener(state);
}

function setState(patch: Partial<ResilienceState>) {
    state = { ...state, ...patch };
    emit();
}

export async function pollMaintenanceStatus() {
    try {
        const response = await apiClient.get("/maintenance/status");
        const payload = (response.data?.data ?? null) as MaintenanceData;
        setState({ maintenance: payload });
    } catch {
        // Silent failure: status polling is best effort.
    }
}

export async function sendHeartbeat() {
    if (!state.online || !readPersistedToken()) return;
    try {
        await apiClient.post("/sync/heartbeat", {
            timestamp: new Date().toISOString(),
            deviceId: localStorage.getItem("upcat.deviceId") || "web",
        });
        setState({ lastHeartbeatAt: new Date().toISOString() });
    } catch {
        // Silent failure: heartbeat should never block UX.
    }
}

export function subscribeResilience(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
        listeners.delete(listener);
    };
}

export function getResilienceState(): ResilienceState {
    return state;
}
export function installGlobalResilienceHooks() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;

    const onOnline = () => setState({ online: true });
    const onOffline = () => setState({ online: false });

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Periodic maintenance-status polling and heartbeat are disabled for serverless hosting.
    // The maintenance/status check is done as a pre-flight request on dynamic pages instead.
    // Re-enable the lines below when moving to persistent-server infrastructure:
    // void pollMaintenanceStatus();
    // void sendHeartbeat();
    // pollTimer = setInterval(() => {
    //     void pollMaintenanceStatus();
    // }, 60_000);
    // heartbeatTimer = setInterval(() => {
    //     void sendHeartbeat();
    // }, 30_000);
    // window.addEventListener("beforeunload", () => {
    //     if (pollTimer) clearInterval(pollTimer);
    //     if (heartbeatTimer) clearInterval(heartbeatTimer);

export const resilienceTestOnly = {
    resetState(online = true) {
        listeners.clear();
        initialized = false;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        pollTimer = null;
        heartbeatTimer = null;
        state = {
            online,
            maintenance: null,
            lastHeartbeatAt: null,
        };
    },
};