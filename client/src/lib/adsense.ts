/**
 * AdSense script loader. Idempotent: only injects the `<script>` tag the first time. It's called for a given publisher id, and rejects gracefully when the publisher id is missing or already loaded with a different id.
 */
const SCRIPT_BASE = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

declare global {
    interface Window {
        adsbygoogle?: unknown[];
        __upcatAdsenseLoadedFor?: string;
    }
}

export function isAdSenseLoadedFor(publisherId: string): boolean {
    if (typeof window === "undefined") return false;
    return window.__upcatAdsenseLoadedFor === publisherId;
}

export function loadAdSenseScript(publisherId: string): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    const id = publisherId.trim();
    if (!id) return false;
    if (window.__upcatAdsenseLoadedFor === id) return true;
    // Different id already loaded - refuse to load a second one.
    if (window.__upcatAdsenseLoadedFor) return false;

    const existing = document.querySelector<HTMLScriptElement>(`script[data-upcat-adsense="${id}"]`);
    if (existing) {
        window.__upcatAdsenseLoadedFor = id;
        return true;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${SCRIPT_BASE}?client=${encodeURIComponent(id)}`;
    script.setAttribute("data-upcat-adsense", id);
    document.head.appendChild(script);
    window.adsbygoogle = window.adsbygoogle || [];
    window.__upcatAdsenseLoadedFor = id;
    return true;
}

export function pushAdSenseSlot(): void {
    if (typeof window === "undefined") return;
    try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
        // AdSense throws synchronously when the script hasn't loaded yet; safe to ignore.
        if (import.meta.env.DEV) console.warn("[adsense] push failed:", err);
    }
}