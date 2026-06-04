/**
 * Phase 13 -- Practice session page.
 *
 * Card-by-card flashcard UI:
 *   1. Question shown, user picks A/B/C/D (or "Skip")
 *   2. Submit answer -> reveal correctAnswer + rationale + rating buttons
 *   3. User rates: Again/Hard/Good/Easy -> SM-2 applied -> next card
 *   4. After last card -> complete session -> show reward overlay
 *
 * The session payload is loaded once at mount; per-card grading + rating happen via /practice/:sessionId/answer and /rate.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { GamificationReward, PracticeRating, PracticeStartResponse } from "@upcat/shared";
import { PRACTICE_RATING_HINTS, PRACTICE_RATING_LABELS, practiceApi } from "@/lib/practiceApi";
import { useToastStore } from "@/stores/toastStore";
import { getResilienceState, subscribeResilience } from "@/lib/resilience";
import { saveSnapshot } from "@/lib/sessionRecovery";
import {
  clampPracticeIndex,
  clearPersistedPracticeRuntime,
  createPracticeSnapshot,
  loadPersistedPracticeRuntime,
  persistPracticeRuntime,
} from "@/pages/practiceSessionRecovery";
import AdSlot from "@/components/AdSlot";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import XpAwardOverlay from "@/components/XpAwardOverlay";
import AchievementToast from "@/components/AchievementToast";

type SessionCard = PracticeStartResponse["cards"][number];

const RATING_ORDER: PracticeRating[] = ["again", "hard", "good", "easy"];
const RATING_STYLES: Record<PracticeRating, string> = {
  again: "bg-rose-600:hover:bg-rose-700 text-white",
  hard: "bg-amber-500:hover:bg-amber-600 text-white",
  good: "bg-emerald-600:hover:bg-emerald-700 text-white",
  easy: "bg-sky-600:hover:bg-sky-700 text-white",
};

interface RevealState {
  isCorrect: boolean;
  correctAnswer: "A" | "B" | "C" | "D";
  rationale: string;
}

export default function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<SessionCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState<PracticeRating | null>(null);
  const [completing, setCompleting] = useState(false);
  const [reward, setReward] = useState<GamificationReward | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [summary, setSummary] = useState<{
    totalAnswered: number;
    totalCorrect: number;
    accuracyPct: number;
  } | null>(null);
  const submitLockRef = useRef(false);
  const rateLockRef = useRef(false);
  const [cardStartedAt, setCardStartedAt] = useState<number>(() => Date.now());
  const [isOnline, setIsOnline] = useState(() => getResilienceState().online);

  // Track online state
  useEffect(() => subscribeResilience((s) => setIsOnline(s.online)), []);

  // Load session payload once per sessionId.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        // We can't re-fetch a started session, but we can attempt to start
        // again with safe defaults -- backend returns the existing session
        // only via the start endpoint. So we navigate here only after
        // `practiceApi.start()` succeeded, which stashes the payload in
        // sessionStorage for replay.
        const cached = sessionStorage.getItem(`upcat.practice.${sessionId}`);
        if (cached) {
          const parsed = JSON.parse(cached) as PracticeStartResponse;
          const runtime = loadPersistedPracticeRuntime(sessionId);
          if (!cancelled) {
            setCards(parsed.cards);
            setIdx(clampPracticeIndex(runtime?.idx ?? 0, parsed.cards.length));
            setLoading(false);
            setCardStartedAt(Date.now());
            return;
          }
        }
        if (!cancelled) {
          setError(
    setLoading(false);
  }
} catch {
  if (!cancelled) {
    setError("Failed to load practice session.");
    setLoading(false);
  }
}
})();
return () => {
  cancelled = true;
}, [sessionId]);

// Periodic snapshot save to server (best-effort, for cross-device recovery).
useEffect(() => {
  if (!sessionId) return;
  const snapTimer = setInterval(() => {
    void saveSnapshot(
      sessionId,
      createPracticeSnapshot(idx, cards.length),
      "practice",
    );
  }, 30_000);
  return () => clearInterval(snapTimer);
}, [sessionId, idx, cards.length]);

useEffect(() => {
  if (!sessionId || cards.length === 0) return;
  persistPracticeRuntime(sessionId, idx);
}, [sessionId, idx, cards.length]);

const currentCard = cards[idx] ?? null;
const isLastCard = idx >= cards.length - 1;
const progressPct = useMemo(
  () => (cards.length ? Math.round(((idx + (reveal ? 1 : 0)) / cards.length) * 100) : 0),
  [idx, reveal, cards.length],
);

async function handleSubmitAnswer(answerOverride?: "A" | "B" | "C" | "D" | null) {
  if (!sessionId || !currentCard || submitting || submitLockRef.current) return;
  if (!isOnline) {
    addToast("info", "You're offline. Your answer will be submitted when you reconnect.");
    return;
  }
  submitLockRef.current = true;
  setSubmitting(true);
  const timeSpentSeconds = Math.max(0, Math.round((Date.now() - cardStartedAt) / 1000));
  try {
    const answer = answerOverride !== undefined ? answerOverride : userAnswer;
    const res = await practiceApi.answer(
      sessionId,
      currentCard.cardId,
      answer,
      timeSpentSeconds,
    );
    setReveal({
      isCorrect: res.isCorrect,
      correctAnswer: res.correctAnswer,
      rationale: res.rationale,
    });
  } catch {
    addToast("error", "Failed to submit answer. Try again.");
  } finally {
    setSubmitting(false);
    submitLockRef.current = false;
  }
}

async function handleRate(r: PracticeRating) {
  if (!sessionId || !currentCard || rating || rateLockRef.current) return;
  rateLockRef.current = true;
  try {
    await practiceApi.rate(sessionId, currentCard.cardId, r);
    // Advance.
    if (isLastCard) {
      await finishSession();
    } else {
      setIdx(i => clampPracticeIndex(i + 1, cards.length));
      setUserAnswer(null);
      setReveal(null);
      setRating(null);
      setCardStartedAt(Date.now());
    }
  } catch {
    addToast("error", "Failed to record rating.");
    setRating(null);
  } finally {
    rateLockRef.current = false;
  }
}

async function finishSession() {
  if (!sessionId || completing) return;
  setCompleting(true);
  try {
    const res = await practiceApi.complete(sessionId);
    setSummary({
      totalAnswered: res.totalAnswered,
      totalCorrect: res.totalCorrect,
accuracyPct: res.accuracyPct,
});
if (res.gamification) {
  setReward(res.gamification);
  setShowOverlay(true);
  if (res.gamification.achievements && res.gamification.achievements.length > 0) {
    setShowAchievements(true);
  }
}
sessionStorage.removeItem(`upcat.practice.${sessionId}`);
clearPersistedPracticeRuntime(sessionId);
} catch {
  addToast("error", "Failed to finalize practice session.");
} finally {
  setCompleting(false);
}

async function exitSession() {
  if (!sessionId) return;
  try {
    // Clear persisted session state
    sessionStorage.removeItem(`upcat.practice.${sessionId}`);
    clearPersistedPracticeRuntime(sessionId);
  } catch {
    // Silently fail - we'll navigate anyway
  }
  navigate("/practice");
}

if (loading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

if (error) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Session unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">{error}</p>
      <Link to="/practice" className="mt-6 inline-block rounded-md bg-maroon-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-maroon-700">
        Back to Practice
      </Link>
    </div>
  );
}

if (summary) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Seo title="Practice Complete - UPCAT Simulator" noindex />
      {showOverlay && reward && (
        <XpAwardOverlay reward={reward} onClose={() => setShowOverlay(false)} />
      )}
      {showAchievements && reward?.achievements?.length ? (
        <AchievementToast events={reward.achievements} onClose={() => setShowAchievements(false)} />
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-maroon-600">Practice complete</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Nice work!</h1>
        <div className="mt-6 flex items-center justify-center gap-8 text-center">
          <Stat label="Answered" value={summary.totalAnswered} />
          <Stat label="Correct" value={summary.totalCorrect} />
          <Stat label="Accuracy" value={`${summary.accuracyPct.toFixed(0)}%`} />
        </div>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => navigate("/practice")}>
            Practice again
          </button>
          <Link to="/practice/stats" className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            View deck stats
          </Link>
        </div>
      </div>
    </div>
  );
}

if (!currentCard) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Spinner />
    </div>
  );
}

const choiceMap = new Map(currentCard.question.choices.map((c) => [c.label, c.text]));
return (
    <div className="mx-auto max-w-6xl px-4 py-8">
        <Seo title="Practice · UPCAT Simulator" noindex />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="min-w-0">
                {/* ── Exit Confirmation Dialog ├── */}
                {showExitConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="rounded-lg bg-white p-6 shadow-lg">
                            <h3 className="text-lg font-semibold text-slate-900">Exit practice session?</h3>
                            <p className="mt-2 text-sm text-slate-600">
                                Your progress will be saved, but this session will not be marked complete.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowExitConfirm(false)}
                                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Continue practicing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void exitSession()}
                                    className="rounded-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                                >
                                    Exit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
)
<button
  key={label}
  type="button"
  disabled={!reveal}
  onClick={() => setUserAnswer(label)}
  className={cls}
>
  {text}
</button>

{!reveal ? (
  <div className="mt-6 flex items-center justify-between">
    <button
      type="button"
      onClick={() => {
        setUserAnswer(null);
        void handleSubmitAnswer(null);
      }}
      disabled={submitting}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      Skip (don't know)
    </button>
    <button
      type="button"
      onClick={() => {
        void handleSubmitAnswer();
      }}
      disabled={submitting || userAnswer === null}
      className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed"
    >
      {submitting ? "Submitting..." : "Show answer"}
    </button>
  </div>
) : (
  <div className="mt-6 space-y-4">
    <div
      className={`rounded-md p-3 text-sm ${reveal.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}
    >
      <strong>
        {reveal.isCorrect ? "Correct!" : `Incorrect. Correct answer: ${reveal.correctAnswer}`}
      </strong>
      {reveal.rationale && (
        <p className="mt-2 whitespace-pre-wrap text-slate-700">{reveal.rationale}</p>
      )}
    </div>
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        How well did you remember?
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RATING_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            title={PRACTICE_RATING_HINTS[r]}
            disabled={!rating || completing}
            onClick={() => handleRate(r)}
            className={`rounded-md px-3 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-50 ${RATING_STYLES[r]}`}
          >
            {PRACTICE_RATING_LABELS[r]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {rating ? completing
          ? "Wrapping up your session..."
          : "Loading next card..."
          : PRACTICE_RATING_HINTS[Rating ?? "good"]}
      </p>
    </div>
  </div>
)}
</article>
</div>

<aside className="lg:sticky lg:top-4">
<AdSlot slotId="practice_sidebar"/>
</aside>
</div>
</div>
}

function Stat({label, value}: { label: string; value: number | string }) {
return (
  <div>
    <div className="text-3xl font-bold text-slate-900">{value}</div>
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </div>
  </div>
);
}