import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {type Toast, type ToastType, useToastStore} from "@/stores/toastStore";

/**
 * Global toast notification system
 * - Portal-mounted, top-right
 * - 4 types: success / error / warning / info
 * - Auto-dismisses with a progress bar
 * - Manual dismiss (X)
 * - Up to 3 stacked
 * - Exit animation before unmount
 */

interface PaletteEntry {
    bar: string;
    border: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    title: string;
    icon: JSX.Element;
}

const PALETTE: Record<ToastType, PaletteEntry> = {
    success: {
        bar: "bg-emerald-500",
        border: "border-emerald-200",
        bg: "bg-white",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        title: "Success",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
        ),
    },
    error: {
        bar: "bg-primary-500",
        border: "border-primary-200",
        bg: "bg-white",
        iconBg: "bg-primary-50",
        iconColor: "text-primary-600",
        title: "Error",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 .9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
        ),
    },
    warning: {
        bar: "bg-amber-500",
        border: "border-amber-200",
        bg: "bg-white",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        title: "Warning",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M4.93 19h14.14a2 2 0 0 0 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.2 16a2 2 0 0 0 1.73 3z"/>
            </svg>
        ),
    },
    info: {
        bar: "bg-blue-500",
        border: "border-blue-200",
        bg: "bg-white",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        title: "Info",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/>
            </svg>
        ),
    },
};

export default function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            aria-live="polite"
            aria-atomic="false"
            role="region"
            aria-label="Notifications"
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-end gap-3 p-4 sm:inset-x-auto sm:right-0"
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t}/>
            ))}
        </div>,
        document.body,
    );
}

function ToastItem({toast}: { toast: Toast }) {
    const removeToast = useToastStore((s) => s.removeToast);
    const [leaving, setLeaving] = useState(false);
    const palette = PALETTE[toast.type];

    const dismiss = () => {
        if (leaving) return;
        setLeaving(true);
        // Allow exit animation to play before removing from store.
        setTimeout(() => removeToast(toast.id), 200);
    };

// If the toast hits its duration while we're still mounted, animate out
// before the store removes us.
    useEffect(() => {
        if (toast.duration <= 0) return;
        const handle = setTimeout(() => setLeaving(true), toast.duration);
        return () => clearTimeout(handle);
    }, [toast.duration]);

    return (
        <div
            role={toast.type === "error" || toast.type === "warning" ? "alert" : "status"}
            className={[
                "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border shadow-lg ring-1 ring-black/5",
                palette.border,
                palette.bg,
                leaving ? "animate-toast-out" : "animate-toast-in",
            ].join(" ")}
        >
            <div className="flex items-start gap-3 p-4">
                <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${palette.iconBg} ${palette.iconColor}`}
                >
                    {palette.icon}
                </div>

                <div className="flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-gray-900">{palette.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{toast.message}</p>
                </div>
            </div>

            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss notification"
                className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18.18 6M6 6M6 12"/>
                </svg>
            </button>
        </div>

        {toast.duration > 0 && (
            <div className="h-1 w-full bg-gray-100">
                <div
                    className={`h-full origin-left ${palette.bar}`}
                    style={{
                        animation: `toastProgress ${toast.duration}ms linear forwards`,
                    }}
                />
            </div>
        )}
    </div>
    );
}
