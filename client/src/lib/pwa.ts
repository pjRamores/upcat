/**
 * Phase 14 — PWA + Push helpers (browser-only).
 *
 * Responsibilities:
 * ... Register `/service-worker.js` at app startup, once per session.
 * ... Capture `beforeinstallprompt` so the in-app install card can fire it.
 * ... Provide a thin wrapper around the Notification + Push subscription
 * ... flows: ask for permission → subscribe → ship the subscription to the
 * ... backend → return the local PushSubscription.
 */
import {pushApi} from "@/lib/pushApi";

type DeferredPrompt = Event &&
  prompt: () => Promise<void>;
const promptListeners = new Set<(available: boolean) => void>();

export function isPwaCapable(): boolean {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
};
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.(("display-mode: standalone"));
  // iOS Safari uses navigator.standalone.
  const iosStandalone = (window.navigator as unknown) as { standalone?: boolean }).standalone;
  return Boolean(mql?.matches || iosStandalone);
}

export function registerServiceWorker() {
  if (!isPwaCapable()) return;
  if (window.location.hostname === "localhost" && import.meta.env.DEV) {
    // Vite dev server intercepts requests — registering SW here will fight
    // HMR. Skip in dev unless explicitly enabled.
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", {scope: "/"})
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[pwa] service worker registration failed", err);
    });
  });
}

export function captureInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as DeferredPrompt;
    promptListeners.forEach((cb) => cb(true));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    promptListeners.forEach((cb) => cb(false));
  });
}

export function onInstallPromptChange(cb: (available: boolean) => void): () => void {
  promptListeners.add(cb);
  cb(deferredPrompt !== null);
  return () => promptListeners.delete(cb);
}

export async function triggerInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const p = deferredPrompt;
  deferredPrompt = null;
  promptListeners.forEach((cb) => cb(false));
  try {
    await p.prompt();
    const {outcome} = await p.userChoice;
    return outcome;
  } catch {
    return "dismissed";
  }
}

// --- Push subscription ---

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
const bytes = new Uint8Array(buf);
let str = "";
for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]!);
return window.btoa(str).replace(/\/+g, "-").replace(/\/g, "_").replace(/=+$/, "");

export interface SubscribeResult {
  status: "ok" | "denied" | "unsupported" | "no-public-key" | "error";
  endpoint?: string;
  message?: string;
}

export async function ensurePushSubscription(opts?: {
  reminderTime?: string;
  timezone?: string;
}): Promise<SubscribeResult> {
  if (!isPushCapable()) return {status: "unsupported"};

  if (Notification.permission === "denied") {
    return {status: "denied", message: "Notifications are blocked in browser settings."};
  }
  if (Notification.permission !== "granted") {
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      return {status: "denied", message: "Notification permission was not granted."};
    }
  }

  let reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) {
    try {
      reg = await navigator.serviceWorker.register("/service-worker.js", {scope: "/"});
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Service worker registration failed",
      };
    }
  }

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: {p256dh?: string; auth?: string};
  };
  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh ?? bufferToBase64Url(sub.getKey("p256dh"));
  const auth = json.keys?.auth ?? bufferToBase64Url(sub.getKey("auth"));
  if (!endpoint || !p256dh || !auth) {
    return {status: "error", message: "Invalid push subscription payload"};
  }

  try {
    await pushApi.subscribe({
      endpoint,
      keys: {p256dh, auth},
      userAgent: navigator.userAgent,
      timezone: opts?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      reminderTime: opts?.reminderTime,
    });
    catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Server rejected subscription",
      };
    }

    return {status: "ok", endpoint};
  }

export async function disablePushOnThisDevice(): Promise<boolean> {
  if (!isPushCapable()) return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => undefined);
  try {
    await pushApi.unsubscribe(endpoint);
  } catch {
    /* server-side cleanup handled by pruning on failure */
  }
  return true;
}