/**
 * Phase 12 -- XP award overlay.
 *
 * Animated count-up notification that surfaces after the API returns a GamificationReward (typically from exam submit / practice complete / login). Stacks XP rewards, then plays a level-up burst if applicable.
 */
import {useEffect, useMemo, useState} from "react";
import type {GamificationReward, XpAwardResult} from "@upcat/shared";

interface Props {
    reward: GamificationReward | null;
    onClose: () => void;
    /** Auto-dismiss delay (ms). Defaults to 4500. */
    durationMs?: number;
}

export default function XpAwardOverlay({
                                           reward,
                                           onClose,
                                           durationMs = 4500,
                                       }: Props) {
    const [displayedXp, setDisplayedXp] = useState(0);
    const totalXp = useMemo(
        () => (reward?.xp ?? []).reduce((sum, r) => sum + r.awarded, 0),
        [reward],
    );
    const levelUp = useMemo(
        () => (reward?.xp ?? []).find((r) => r.leveledUp) || null,
        [reward],
    );

    useEffect(() => {
        if (!reward || totalXp === 0) return;
        let raf = 0;
        let start = 0;

        const animate = (ts: number) => {
            if (!start) start = ts;
            const elapsed = ts - start;
            const progress = Math.min(1, elapsed / 1100);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayedXp(Math.round(eased * totalXp));
            if (progress < 1) raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        const dismiss = window.setTimeout(onClose, durationMs);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(dismiss);
        };
    }, [reward, totalXp, durationMs, onClose]);

    if (!reward || totalXp === 0) return null;

    return (
        <div
            className="fixed inset-x-0 top-6 z-[60] flex justify-center px-4 pointer-events-none"
            role="status"
            aria-live="polite"
        >
            <div
                className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-5 text-white shadow-2xl animate-in-down"
                role="button"
                aria-label="Dismiss XP award overlay"
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 text-2xl text-amber-900"
                        role="button"
                        aria-label="Dismiss XP award overlay"
                    >
                        <svg width={24} height={24}>
                            <path d="M5 8h14v6H5V8zm7 3h-3V5H4v14zM9.08 9H4V5h.08l4-4 4 4z"/>
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div
                            className="text-xs font-semibold uppercase tracking-wide opacity-80"
                            role="button"
                            aria-label="Dismiss XP award overlay"
                        >
                            XP earned
                        </div>
                        <div
                            className="text-2xl font-bold tabular-nums"
                            role="button"
                            aria-label="Dismiss XP award overlay"
                        >
                            {displayedXp.toLocaleString()}
                        </div>
                    </div>
                </div>
                <button type="button" onClick={onClose}
                        className="rounded-full bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
                    X
                </button>
            </div>

            <ul className="mt-3 space-y-1 text-xs opacity-90">
                {reward.xp.map((r, i) => (
                    <XpBreakdownRow key={i} reward={r}/>
                ))}
            </ul>

            {levelUp && (
                <div
                    className="mt-4 rounded-lg bg-amber-300/95 px-4 py-3 text-center text-amber-900 shadow-inner"
                    role="button"
                    aria-label="Dismiss XP award overlay"
                >
                    Level-up!
                    <div className="text-xl font-bold">
                        Level {levelUp.newLevel} - {levelUp.newTitle}
                    </div>
                </div>
            )}
        </div>
    );
}
<style>
    @keyframes xp-in-down {
    from {opacity: 0; transform: translateY(-1rem) scale(0.95);}
    to   {opacity: 1; transform: translateY(0) scale(1);}
}
    .animate-in-down {animation: xp-in-down 280ms ease-out;}
</style>
</div>

}

function XpBreakdownRow({reward}: { reward: XpAwardResult }) {
    if (reward.awarded <= 0) return null;
    const isAchievement = reward.reason === "achievement_unlocked";
    return (
        <li className="flex justify-between">
            <span>{labelForReason(reward)}</span>
            <span className="font-mono">
        {reward.awarded}
                {isAchievement && reward.multiplier > 1 &&
                    <span className="ml-1 text-amber-200">
            x{reward.multiplier.toFixed(2)}
          </span>}
      </span>
        </li>
    );
}

function labelForReason(r: XpAwardResult): string {
    switch (r.reason) {
        case "exam_completed":
            return "Exam completed";
        case "exam_correct_bonus":
            return "Correct answer bonus";
        case "exam_score_80":
            return "Score 80%";
        case "exam_score_90":
            return "Score 90%";
        case "exam_perfect":
            return "Perfect score!";
        case "exam_perfect_subject":
            return "Perfect subject";
        case "first_exam":
            return "First exam ever";
        case "daily_login":
            return "Daily login";
        case "review_all_incorrect":
            return "Reviewed all mistakes";
        case "practice_completed":
            return "Practice completed";
        case "practice_correct":
            return "Practice correct";
        case "achievement_unlocked":
            return "Achievement bonus";
        case "weekly_challenge":
            return "Weekly challenge";
        case "admin_grant":
            return "Admin grant";
    }
}