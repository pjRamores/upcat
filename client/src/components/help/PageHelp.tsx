import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {Link, useLocation} from "react-router-dom";
import type {ContextualHelpPoint} from "@upcat/shared";
import {helpApi} from "@/lib/helpApi";
import {useAuthStore} from "@/stores/authStore";

interface AnchorPosition {
    top: number;
    left: number;
}

function mapPage(pathname: string): string | null {
    if (pathname === "/practice" || pathname === "/practice-test/configure") return "/practice-test/configure";
    if (pathname === "/dashboard" || pathname.startsWith("/mock-exam")) return "/mock-exam";
    if (/^\/exam\//.test(pathname)) return "/exam/:id";
    if (pathname === "/stats") return "/stats";
    if (pathname.startsWith("/study-plan")) return "/study-plan";
    if (pathname === "/profile" || pathname === "/achievements") return "/profile";
    if (pathname === "/settings") return "/settings";
    if (pathname.startsWith("/payment")) return "/payment";
    return null;
}

export default function PageHelp() {
    const location = useLocation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isAdmin = useAuthStore((s) => s.isAdmin());
    const searchParams = new URLSearchParams(location.search);
    const isAdminPreview = searchParams.get("adminPreview") === "1";
    const previewHelpId = searchParams.get("helpId");

    const [items, setItems] = useState<ContextualHelpPoint[]>([]);
    const [newUser, setNewUser] = useState(false);
    const [active, setActive] = useState<ContextualHelpPoint | null>(null);
    const [positions, setPositions] = useState<Record<string, AnchorPosition>>({});
    const page = useMemo(() => mapPage(location.pathname), [location.pathname]);

    useEffect(() => {
        if (!isAuthenticated || (isAdmin && !isAdminPreview) || !page) {
            setItems([]);
            return;
        }
        let cancelled = false;
        helpApi
            .contextual(page)
            .then((result) => {
                if (!cancelled) {
                    // Filter to single item if previewing specific help ID
                    const filtered = previewHelpId
                        ? result.items.filter((item) => item.id === previewHelpId)
                        : result.items;
                    setItems(filtered);
                    setNewUser(result.isNewUser);
                }
            })
            .catch(() => {
                if (!cancelled) setItems([]);
            });
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, isAdmin, isAdminPreview, page, previewHelpId]);

    useEffect(() => {
        function computePositions() {
            const next: Record<string, AnchorPosition> = {};
            for (const item of items) {
                const el = document.querySelector(item.elementRef) as HTMLElement | null;
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                next[item.id] = {
                    top: Math.max(8, rect.top + 6),
                    left: Math.max(8, rect.right - 10),
                };
            }
            setPositions(next);
        }

        computePositions();

        // Re-measure for post-navigation/layout shifts (async content, fonts, images).
        let rafId: number | null = null;
        const scheduleCompute = () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = null;
                computePositions();
            });
        };

        window.addEventListener("resize", computePositions);
        window.addEventListener("scroll", computePositions, {passive: true});

        const resizeObserver = new ResizeObserver(scheduleCompute);
        for (const item of items) {
            const el = document.querySelector(item.elementRef) as HTMLElement | null;
            if (el) resizeObserver.observe(el);
        }

        const mutationObserver = new MutationObserver(scheduleCompute);
        mutationObserver.observe(document.body, {childList: true, subtree: true, attributes: true});

        return () => {
            window.removeEventListener("resize", computePositions);
            window.removeEventListener("scroll", computePositions);
            if (rafId !== null) cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [items]);

    if (!items.length) return null;

    return createPortal(
        <>
            {items
                .filter((item) => positions[item.id])
                .map((item) => {
                    const pos = positions[item.id]!;
                    const pulse = newUser && item.showForNewUsers;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={`Help: ${item.title}`}
                            onClick={() => setActive(item)}
                            className={`fixed z-20 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-600 shadow hover:border-indigo-500 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${pulse ? "animate-pulse" : ""}`}
                            style={{top: pos.top, left: pos.left}}
                        >
                            ?
                        </button>
                    );
                })}

            {active && (
                <HelpOverlay
                    item={active}
                    onClose={() => setActive(null)}
                    onDismiss={async () => {
                        await helpApi.dismissContextual(active.id).catch(() => undefined);
                        setItems((prev) => prev.filter((item) => item.id !== active.id));
                        setActive(null);
                    }}
                />
            )}
        </>,
        document.body,
    );
}

function HelpOverlay({
                         item,
                         onClose,
                         onDismiss,
                     }: {
    item: ContextualHelpPoint;
    onClose: () => void;
    onDismiss: () => void;
}) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (item.type === "slide_panel") {
        return (
            <div className="fixed inset-0 z-[80]">
                <button type="button" aria-label="Close help panel" className="absolute inset-0 bg-black/40"
                        onClick={onClose}/>
                <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                        <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100"
                                onClick={onClose}>ｘ
                        </button>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.shortDescription}</p>
                    {item.detailedContent && (
                        <div
                            className="prose prose-sm mt-4 whitespace-pre-line text-slate-700">{item.detailedContent}</div>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        {item.helpArticleSlug && (
                            <Link className="text-sm font-medium text-primary-700 hover:underline"
                                  to={`/help/article/${item.helpArticleSlug}${item.helpArticleSection ?? ""}`}>
                                View Full Article →
                            </Link>
                        )}
                        {item.dismissable && (
                            <button type="button" className="text-sm text-slate-600 underline" onClick={onDismiss}>
                                Don't show again
                            </button>
                        )}
                    </div>
                </aside>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
            <button type="button" aria-label="Close help" className="absolute inset-0 bg-black/20" onClick={onClose}/>
            <div
                className="absolute left-1/2 top-24 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            onClick={onClose}>X
                    </button>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.shortDescription}</p>
                {item.detailedContent && item.type === "popover" && (
                    <p className="mt-2 text-xs text-slate-600">{item.detailedContent}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    {item.helpArticleSlug && (
                        <Link className="text-xs font-medium text-primary-700 hover:underline"
                              to={`/help/article/${item.helpArticleSlug}${item.helpArticleSection ?? ""}`}>
                            Learn more →
                        </Link>
                    )}
                    {item.dismissable && (
                        <button type="button" className="text-xs text-slate-600 underline" onClick={onDismiss}>
                            Don't show again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
