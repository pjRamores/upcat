/**
 * Phase 12 - Achievement unlock toast queue.
 *
 * Displays a stack of achievement unlock notifications with rarity-tinted
 * glow. Pass an array of AchievementUnlockEvent objects; the queue is
 * displayed one at a time with auto-dismissal.
 */
import {useEffect, useState} from "react";
import type { AchievementUnlockEvent } from "@upcat/shared";

interface Props {
    events: AchievementUnlockEvent[];
    onClose: () => void;
    /** Display time per event (ms). Defaults to 4000. */
    durationMs?: number;
}

const RARITY_GLOW: Record<AchievementUnlockEvent["rarity"], string> = {
    common: "from-slate-400 to-slate-500 shadow-slate-300/50",
    uncommon: "from-emerald-400 to-emerald-600 shadow-emerald-300/60",
    rare: "from-sky-400 to-blue-600 shadow-sky-300/70",
    epic: "from-violet-500 to-fuchsia-600 shadow-violet-400/70",
    legendary: "from-amber-400 to-orange-500 shadow-amber-300/80",
};

export default function AchievementToast({
                                             events,
                                             onClose,
                                             durationMs = 4000,
}: Props) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (events.length === 0) return;
        setIndex(0);
    }, [events]);

    useEffect(() => {
        if (events.length === 0) return;
        const t = window.setTimeout(() => {
            if (index + 1 < events.length) {
                setIndex(index + 1);
            } else {
                onClose();
            }
        }, durationMs);
        return () => window.clearTimeout(t);
    }, [events, index, durationMs, onClose]);

    if (events.length === 0) return null;
    const event = events[index];
    if (!event) return null;

    const gradient = RARITY_GLOW[event.rarity];

    return (
        <div
            className="fixed bottom-6 right-6 z-[60] w-full max-w-sm px-4 pointer-events-none sm:px-0"
            role="status"
            aria-live="polite"
        >
            <div
                className={`pointer-events-auto rounded-2xl bg-gradient-to-br ${gradient} p-1 shadow-2xl animate-toast-in`}
            >
                <div className="rounded-[14px] bg-white p-4">
                    <div className="flex items-start gap-3">
                        <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200.to-amber-400 text-2xl">
                            🏆
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Achievement unlocked · {event.rarity}
                            </div>
                            <h3 className="mt-0.5 font-bold text-slate-900">{event.title}</h3>
                            <p className="mt-1 text-xs text-slate-600">{event.description}</p>
                            <div className="mt-2 text-xs font-semibold text-emerald-600">
                                +{event.xpAwarded} XP · +{event.points} pts
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Dismiss"
                    >
                        ⨉
                    </button>
                </div>
                {events.length > 1 && (
                    <div className="mt-3 flex gap-1">
                        {events.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full ${
                                    i <= index ? "bg-indigo-500" : "bg-slate-200"
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

<style>{`
@keyframes toast-in {
    from { opacity: 0; transform: translateY(1rem) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-toast-in { animation: toast-in 240ms ease-out; }
```