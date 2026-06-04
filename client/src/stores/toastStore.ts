import { create } from "zustand";

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    /** Total lifetime in ms (used for auto-dismiss & progress bar). */
    duration: number;
    /** Epoch ms when the toast was created. */
    createdAt: number;
}

interface ToastState {
    toasts: Toast[];
    /** Maximum number of toasts visible at once (older overflow toasts are removed). */
    maxVisible: number;
    addToast: (type: ToastType, message: string, durationMs?: number) => string;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

let toastCounter = 0;
const DEFAULT_DURATION = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],
    maxVisible: 3,

    addToast: (type, message, durationMs = DEFAULT_DURATION) => {
        const id = `toast-${++toastCounter}`;

        // Suppress success toasts globally; keep error/warning/info notifications.
        if (type === "success") {
            return id;
        }

        const now = Date.now();
        const toast: Toast = {id, type, message, duration: durationMs, createdAt: now};

        set((s) => {
            const next = [...s.toasts, toast];
            // Drop oldest toasts to keep within visible limit.
            while (next.length > s.maxVisible) next.shift();
            return {toasts: next};
        });

        if (durationMs > 0) {
            setTimeout(() => {
                // Only remove if still present (user may have dismissed manually).
                if (get().toasts.some((t) => t.id === id)) {
                    set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)}));
                }
            }, durationMs);
        }

        return id;
    },

    removeToast: (id) =>
        set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)})),

    clearToasts: () => set({toasts: []}),
}));