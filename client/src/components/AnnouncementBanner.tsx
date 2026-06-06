import {useEffect, useState} from "react";
import type {Announcement} from "@upcat/shared";
import {
    getActiveStaticAnnouncements,
    hasUsableStaticAnnouncements,
    loadStaticAnnouncements,
} from "@/lib/staticAnnouncements";

const STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: {bg: "bg-primary-50", border: "border-primary-200", text: "text-primary-800", icon: ""},
    warning: {bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: "⚠️"},
    maintenance: {bg: "bg-primary-50", border: "border-primary-200", text: "text-primary-800", icon: "🛠️"},
};

const DISMISS_KEY = "dismissed-announcements";

function readDismissed(): Set<string> {
    try {
        return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? "[]"));
    } catch {
        return new Set();
    }
}

function persistDismissed(set: Set<string>) {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
}

/**
 * Reviewee-side banner that fetches /api/announcements on page load.
 * Each announcement can be dismissed for the current browser session.
 *
 * Polling is disabled for serverless hosting. Re-enable the interval below
 * when moving to persistent-server infrastructure.
 */
export default function AnnouncementBanner() {
    const [items, setItems] = useState<Announcement[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const snapshot = await loadStaticAnnouncements();
                const data = hasUsableStaticAnnouncements(snapshot)
                    ? getActiveStaticAnnouncements(snapshot)
                    : [];
                if (!cancelled) setItems(data);
            } catch {
                /* silent -- banner is best-effort */
            }
        };
        load();
        // const handle = window.setInterval(load, 5 * 60 * 1000);
        return () => {
            cancelled = true;
            // window.clearInterval(handle);
        };
    }, []);

    const visible = items.filter((a) => !dismissed.has(a._id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-2 px-4 pt-3 lg:px-8">
            {visible.map((a) => {
                const s = (STYLES[a.type] ?? STYLES.info)!;
                return (
                    <div
                        key={a._id} role="status"
                        role="status"
                        className={`flex items-start gap-3 rounded-lg border ${s.border} ${s.bg} ${s.text} px-4 py-3 text-sm shadow-sm`}
                    >
                        <span aria-hidden>{s.icon}</span>
                        <div className="flex-1">
                            <p className="font-semibold">{a.title}</p>
                            <p className="mt-0.5">{a.message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                              const next = new Set(dismissed);
                              next.add(a._id);
                              setDismissed(next);
                              persistDismissed(next);
                            }}
                            aria-label="Dismiss announcement"
                            className="rounded-md p-1 hover:bg-white/40"
                        >
                          ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
