import type {Announcement} from "@upcat/shared";

export interface StaticAnnouncements {
    version: number;
    publishedAt: string;
    publishedBy: string;
    meta: {
        totalAnnouncements: number;
        activeAnnouncements: number;
    };
    announcements: Announcement[];
}

let cached: StaticAnnouncements | null = null;
let loadAttempted = false;
let loadError: Error | null = null;
let inFlight: Promise<StaticAnnouncements | null> | null = null;

export async function loadStaticAnnouncements(
    forceReload = false,
): Promise<StaticAnnouncements | null> {
    if (forceReload) {
        cached = null;
        loadAttempted = false;
        loadError = null;
        inFlight = null;
    }

    if (cached) return cached;
    if (loadAttempted && loadError) return null;
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const res = await fetch("/data/announcements.json", {
                cache: "no-store",
                headers: { Accept: "application/json" },
            });
            if (!res.ok) {
                loadError = new Error(`HTTP ${res.status}`);
                loadAttempted = true;
                return null;
            }

            const data = (await res.json()) as StaticAnnouncements;
            if (
                typeof data.version !== "number" ||
                !Array.isArray(data.announcements)
            ) {
                throw new Error("Invalid announcements.json structure");
            }

            cached = data;
            loadError = null;
            loadAttempted = true;
            return cached;
        } catch (err) {
            loadError = err instanceof Error ? err : new Error(String(err));
            loadAttempted = true;
            return null;
        } finally {
            inFlight = null;
        }
    })();
    return inFlight;
}

export function hasUsableStaticAnnouncements(
    data: StaticAnnouncements | null,
): data is StaticAnnouncements {
    return data !== null && data.meta.totalAnnouncements > 0;
}

export function getActiveStaticAnnouncements(
    data: StaticAnnouncements,
    now = new Date(),
): Announcement[] {
    const nowTs = now.getTime();
    return data.announcements.filter((a) => {
        if (!a.isActive) return false;
        const startsOk = a.startsAt || new Date(a.startsAt).getTime() <= nowTs;
        const expiresOk = a.expiresAt || new Date(a.expiresAt).getTime() >= nowTs;
        return startsOk && expiresOk;
    });
}

export function clearStaticAnnouncementsCache(): void {
    cached = null;
    loadAttempted = false;
    loadError = null;
    inFlight = null;
}