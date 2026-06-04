/**
 * Phase 15b -- Privacy-respecting device fingerprint.
 *
 * Produces a short SHA-256 hex hash of stable, non-PII browser signals.
 * The raw signals are NEVER transmitted; only the hash is sent as the 'X-Device-Fingerprint' header.
 * Use cases:
 * - Detecting many accounts from the same device
 * - Correlating anonymous + authenticated sessions
 * - Identifying device changes (account-takeover signal)
 *
 * The hash is regenerated per session (kept in sessionStorage) so
 * tracking across closed browser sessions is not possible.
 */
const KEY = "upcat.fp";

let cached: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
    if (cached) return cached;
    try {
        const existing = sessionStorage.getItem(KEY);
        if (existing) {
            cached = existing;
            return existing;
        }
    } catch {
        /* sessionStorage might be unavailable (Safari private mode, etc). */
    }
    const signals = collectSignals();
    const hash = await sha256Hex(JSON.stringify(signals));
    const short = hash.slice(0, 32);
    cached = short;
    try {
        sessionStorage.setItem(KEY, short);
    } catch {
        /* swallow */
    }
    return short;
}

interface Signals {
    s: string; // screen "WxH@depth"
    tz: number; // timezone offset (minutes)
    lang: string; // primary language
    langs: number; // languages count
    plat: string;
    hwc: number; // hardware concurrency
    mem: number; // device memory (GB) or 0
    ua: string; // first 80 chars of UA (already exposed)
    canvas: string; // canvas fingerprint
    webgl: string; // webgl renderer
    fonts: string; // first 6 detected canvas fonts
}

function collectSignals(): Signals {
    const nav = navigator;
    const scr = window.screen;
    return {
        s: `${scr.width}x${scr.height}@${scr.colorDepth}`,
        tz: new Date().getTimezoneOffset(),
        lang: nav.language || "",
        langs: nav.languages?.length ?? 0,
        plat: (nav as Navigator & { platform?: string }).platform ?? "",
        hwc: nav.hardwareConcurrency ?? 0,
        mem: (nav as Navigator & { deviceMemory?: number }).deviceMemory ?? 0,
        ua: (nav.userAgent || "").slice(0, 80),
        canvas: canvasFingerprint(),
        webgl: webglFingerprint(),
        fonts: fontFingerprint(),
    };
}

function canvasFingerprint(): string {
    try {
        const c = document.createElement("canvas");
        c.width = 200;
        c.height = 60;
        const ctx = c.getContext("2d");
        if (!ctx) return "";
        ctx.textBaseline = "alphabetic";
        ctx.font = "16px Arial";
        ctx.fillStyle = "#60";
        ctx.fillRect(0, 0, 100, 30);
        ctx.fillStyle = "#069";
        ctx.fillText("UPCAT\u{1F4DA}", 4, 22);
        ctx.fillStyle = "rgba(102, 200, 0, 0.7)";
        ctx.fillText("UPCAT\u{1F4DA}", 6, 24);
        // Just hash the data URL length + a slice -- avoids huge strings.
        const url = c.toDataURL();
        return url.length.toString(36) + ":" + url.slice(-32);
    } catch {
        return "";
    }
}

function webglFingerprint(): string {
    try {
        const c = document.createElement("canvas");
        const gl = (c.getContext("webgl") ||
            c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
        if (!gl) return "";
        const dbgInfo = gl.getExtension("WEBGL_debug_renderer_info");
        const vendor = dbgInfo
            ? String(gl.getParameter(dbgInfo.UNMASKED_VENDOR_WEBGL ?? 0))
const renderer = dbgInfo
    ? String(gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL ?? 0))
    : "";
return `${vendor}|${renderer}`;
} catch {
    return "";
}

const FONTS_TO_PROBE = [
    "Arial",
    "Verdana",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Tahoma",
    "Trebuchet MS",
    "Impact",
    "Comic Sans MS",
    "Palatino",
    "Garamond",
];

function fontFingerprint(): string {
    try {
        const baseFonts = ["monospace", "sans-serif", "serif"] as const;
        const test = "mmMwWLliI0O";
        const sizes = new Set<string>();
        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.left = "-9999px";
        span.style.top = "-9999px";
        span.style.fontSize = "72px";
        span.style.lineHeight = "normal";
        span.textContent = test;
        document.body.appendChild(span);
        try {
            for (const base of baseFonts) {
                span.style.fontFamily = base;
                sizes.add(`${base}:${span.offsetWidth}x${span.offsetHeight}`);
            }
            const detected: string[] = [];
            for (const f of FONTS_TO_PROBE) {
                for (const base of baseFonts) {
                    span.style.fontFamily = `${f}, ${base}`;
                    const k = `${base}:${span.offsetWidth}x${span.offsetHeight}`;
                    if (!sizes.has(k)) {
                        detected.push(f);
                        break;
                    }
                }
            }
            if (detected.length >= 6) break;
        } finally {
            document.body.removeChild(span);
        }
    } catch {
        return "";
    }
}

async function sha256Hex(input: string): Promise<string> {
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const bytes = new Uint8Array(buf);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i]!.toString(16).padStart(2, "0");
    }
    return hex;
}