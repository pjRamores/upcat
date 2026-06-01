/* eslint-env serviceworker */
/* global self, caches, clients */
/**
 * UPCAT Simulator - service worker.
 *
 * Strategies:
 * * App·shell (HTML/JS/CSS/icons): cache-first with stale-while-revalidate
 * * update·on·success·The·app·shell is·cached·on·install+·on·first·nav.
 * * Same-origin·GET /api/* (read-only): network-first with cache·fallback,
 * * scoped·to·a·small·allow-list (questions, stats)·so·private/mutable
 * * responses·are·never·cached. Cached·entries·are·evicted·with·a·24h·TTL.
 * * Anything·else: passthrough·to·the·network.
 *
 * Also·handles `push`·events, rendering·a·notification·from·the·JSON·payload,
 * and `notificationclick`·to·focus·or·open·the·in-app·URL.
 */

const VERSION = "v1.0.0";
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const API_CACHE = `api-${VERSION}`;
const API_TTL_MS = 24 * 60 * 60 * 1000;

const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
];

// GET endpoints safe to cache offline. Anything not listed bypasses the cache.
const CACHEABLE_API_PATTERNS = [
    /^\/api\/announcements\b/,
    /^\/api\/status\b/,
    /^\/api\/practice\/stats\b/,
    /^\/api\/gamification\/profile\b/,
    /^\/api\/help\/articles\b/,
    /^\/api\/help\/categories\b/,
    /^\/api\/help\/search\b/,
    /^\/api\/help\/contextual\b/,
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k !== API_CACHE)
                    .map((k) => caches.delete(k)),
            ),
        ).then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const {request} = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.startsWith("/api/")) {
        if (CACHEABLE_API_PATTERNS.some((re) => re.test(url.pathname))) {
            event.respondWith(networkFirstWithTtl(request));
        }
        // Non-allow-listed API calls fall through to the network (no SW handling).
        return;
    }

    // Navigation requests → serve cached shell, then refresh in the background.
    if (request.mode === "navigate") {
        event.respondWith(navigationHandler(request));
        return;
    }

    // Static assets (JS/CSS/images) → cache-first with revalidate.
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
});

async function navigationHandler(request) {
    try {
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put("/index.html", fresh.clone()).catch(() => undefined);
        return fresh;
    } catch {
        const cache = await caches.open(SHELL_CACHE);
        const cached = (await cache.match("/index.html")) || (await cache.match("/"));
        if (cached) return cached;
        return new Response(
            `<!doctype html><meta charset="utf-8"><title>Offline</title>
          <body style="font-family:system-ui;padding:2rem;text-align:center">
            <h1>You're offline</h1>
            <p>Reconnect to keep practicing.</p>
          </body>`,
            {status: 503, headers: {"Content-Type": "text/html"}},
        );
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
        fetch(request)
            .then((res) => {
                if (res && res.status === 200 && res.type !== "opaque") {
                    cache.put(request, res.clone()).catch(() => undefined);
                }
            })
            .catch(() => undefined);
        return cached;
    }
    try {
        const res = await fetch(request);
        if (res && res.status === 200 && res.type !== "opaque") {
            cache.put(request, res.clone()).catch(() => undefined);
        }
        return res;
    } catch (err) {
        return cached || Response.error();
    }
}

async function networkFirstWithTtl(request) {
    const cache = await caches.open(API_CACHE);
    try {
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200) {
            const headers = new Headers(fresh.headers);
            headers.set("x-sw-cached-at", new Date().toISOString());
            const body = await fresh.clone().blob();
            const cloned = new Response(body, {
                status: fresh.status,
                statusText: fresh.statusText,
                headers,
            });
            cache.put(request, cloned).catch(() => undefined);
        }
        return fresh;
    } catch {
        const cached = await cache.match(request);
        if (cached) {
            const at = cached.headers.get("x-sw-cached-at");
            if (at && Date.now() - new Date(at).getTime() < API_TTL_MS) {
                return cached;
            }
        }
        return new Response(
            JSON.stringify({success: false, error: "Offline and no cached response available."}),
            {status: 503, headers: {"Content-Type": "application/json"}},
        );
    }
}

// Push handler
self.addEventListener("push", (event) => {
    if (!event.data) return;
    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = {title: "UPCAT Simulator", body: event.data.text()};
    }
    const title = payload.title || "UPCAT Simulator";
    const options = {
        body: payload.body || "",
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-192.png",
        image: payload.image,
        tag: payload.type || "general",
        renotify: true,
        data: {
            url: payload.url || "/dashboard",
            ...(payload.data || {}),
        },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";
    event.waitUntil(
        (async () => {
            const all = await clients.matchAll({type: "window", includeUncontrolled: true});
            for (const client of all) {
                try {
                    const u = new URL(client.url);
                    if (u.origin === self.location.origin) {
                        await client.focus();
                        if ("navigate" in client) await client.navigate(targetUrl);
                        return;
                    }
                } catch {
                    /* ignore */
                }
            }
        )
        })
    );
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});