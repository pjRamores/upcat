/**
 * Phase 12 - XP award overlay.
 *
 * Animated count-up notification that surfaces after the API returns a
 * Gamification Reward (typically from exam submit / practice complete /
 * login). Stacks XP rewards, then plays a level-up burst if applicable.
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
  props: {
    () => (reward?.xp ?? []).reduce((sum, r) => sum + r.awarded, 0),
    [reward],
  };
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
        className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2x1 bg-gradient-to-br from-indigo-600 to-purple-600 p-5 text-white shadow-2x1">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 text-2x1 text-amber-900">
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
              XP earned
            </div>
            <div className="text-2x1 font-bold tabular-nums">
              +{displayedXp.toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            aria-label="Dismiss"
          >
            X
          </button>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-xs opacity-90">
        {reward.xp.map((r, i) => (
          <XpBreakdownRow key={i} reward={r} />
        ))}
      </ul>

      {levelUp && (
        <div className="mt-4 rounded-lg bg-amber-300/95 px-4 py-3 text-center text-amber-900 shadow-inner">
          <div className="text-xs font-semibold uppercase tracking-wide">
            Level up!
          </div>
          <div className="text-xl font-bold">
            Level {levelUp.newLevel} {levelUp.newTitle}
          </div>
        </div>
      )}
    </div>
  );
}
<style>{`
  @keyframes xp-in-down {
    from { opacity: 0; transform: translateY(-1rem) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-in-down { animation: xp-in-down 280ms ease-out; }
</style>
</div>
);
}

function XpBreakdownRow({reward}: {reward: XpAwardResult}) {
  if (reward.awarded <= 0) return null;
  const isAchievement = reward.reason === "achievement_unlocked";
  return (
    <li className="flex justify-between">
      <span>{labelForReason(reward)}</span>
      <span className="font-mono">
        +{reward.awarded}
      </span>
      {!isAchievement && reward.multiplier > 1 && (
        <span className="ml-1 text-amber-200">
          x{reward.multiplier.toFixed(2)}
        </span>
      )}
    </span>
  );
}

function labelForReason(r: XpAwardResult): string {
  switch(r.reason) {
    case "exam_completed":
      return "Exam completed";
    case "exam_correct_bonus":
      return "Correct-answer bonus";
    case "exam_score_80":
      return "Score 80%+";
    case "exam_score_90":
      return "Score 90%+";
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