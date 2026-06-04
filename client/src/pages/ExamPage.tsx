import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { type AnswerLetter, useExamStore } from "@/stores/examStore";
import { useToastStore } from "@/stores/toastStore";
import MathText from "@/components/MathText";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import { SUBJECT_META } from "@upcat/shared";
import { getResilienceState, subscribeResilience } from "@/lib/resilience";

const ANSWER_KEYS: AnswerLetter[] = ["A", "B", "C", "D"];

export function formatOfflineBannerText(
  isOnline: boolean,
  pendingSyncCount: number
): string | null {
  if (isOnline) return null;
  return `You are offline - answers are saved locally${pendingSyncCount > 0 ? `${pendingSyncCount} pending` : ""}`;
}

export function derivePendingSyncCount(
  isOnline: boolean,
  dirtyCount: number,
  currentPending: number
): number {
  return isOnline ? currentPending : dirtyCount;
}

export function computeRemainingSeconds(
  timeLimitMinutes: number,
  timerExtensionMs: number,
  elapsedSeconds: number
): number {
  return Math.max(0, timeLimitMinutes * 60 + Math.round(timerExtensionMs / 1000) - elapsedSeconds);
}

export default function ExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const {
    init,
    reset,
    totalQuestions,
    timeLimit,
    startedAt,
    states,
    currentIndex,
    setCurrent,
    selectAnswer,
    toggleFlag,
    tick,
    submit,
    loaded,
    loading,
    submitting,
    error,
    timerExtensionMs,
    isPaused,
    pauseSession,
    resumeSession,
  } = useExamStore();

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [passageOpen, setPassageOpen] = useState(true);
  const submitInFlight = useRef(false);
  const pauseInFlight = useRef(false);
  const [pausingVisual, setPausingVisual] = useState(false);
  const warnedThirtySecondsRef = useRef(false);
  const [isOnline, setIsOnline] = useState(() => getResilienceState().online);
  const shouldAutoResume = useMemo(
    () => new URLSearchParams(location.search).get("resume") === "1",
    [location.search]
  );

  useEffect(() => {
    if (!sessionId) return;
    void init(sessionId);
    return () => {
      // Don't reset on unmount - user may navigate to results next.
    };
  }, [sessionId, init]);

  const elapsed = useElapsed(startedAt, isPaused);
  const remaining = computeRemainingSeconds(timeLimit, timerExtensionMs, elapsed);

  useEffect(() => {
    if (!startedAt || isPaused) return;
    const id = window.setInterval(() => tick(1), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, isPaused, tick]);

  useEffect(() => {
    subscribeResilience((state) => {
      setIsOnline(state.online);
    });
  }, []);

  const doSubmit = useCallback(async () => {
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await submit();
      addToast("success", "Exam submitted!");
      reset();
      navigate(`/results/${sessionId}`, { replace: true });
    } catch {
      submitInFlight.current = false;
      addToast("error", "Submission failed. Please try again.");
    }
  }, [submit, reset, navigate]);
}, [submit, addToast, reset, navigate, sessionId]);

useEffect(() => {
    if (!startedAt || timeLimit === 0 || isPaused) return;
    if (remaining === 0 && !submitInFlight.current) {
        addToast("info", "Time's up - submitting your exam.");
        void doSubmit();
    }
}, [remaining, startedAt, timeLimit, isPaused, addToast, doSubmit]);

useEffect(() => {
    if (remaining > 30) {
        warnedThirtySecondsRef.current = false;
        return;
    }
    if (remaining > 0 && !warnedThirtySecondsRef.current) {
        warnedThirtySecondsRef.current = true;
        addToast("warning", "Only 30 seconds left!");
    }
}, [remaining, addToast]);

const handlePause = useCallback(async () => Promise<boolean> => {
    if (pauseInFlight.current) return false;
    pauseInFlight.current = true;
    setPausingVisual(true);
    try {
        await pauseSession();
        addToast("info", "Exam paused. You can resume anytime.");
        return true;
    } catch {
        addToast("error", "Could not pause exam. Please try again.");
        return false;
    } finally {
        setPausingVisual(false);
        pauseInFlight.current = false;
    }
}, [pauseSession, addToast]);

const handleResume = useCallback(async () => {
    if (pauseInFlight.current) return;
    pauseInFlight.current = true;
    try {
        await resumeSession();
        addToast("success", "Exam resumed.");
    } catch {
        addToast("error", "Could not resume exam. Please try again.");
    } finally {
        pauseInFlight.current = false;
    }
}, [resumeSession, addToast]);

const handlePauseAndExit = useCallback(async () => {
    if (!isPaused) {
        const ok = await handlePause();
        if (!ok) return;
    }
    navigate("/dashboard");
}, [isPaused, handlePause, navigate]);

useEffect(() => {
    if (!shouldAutoResume || !isPaused || pauseInFlight.current) return;
    void handleResume();
}, [shouldAutoResume, isPaused, handleResume]);

// ─── beforeunload warning
useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
        if (submitInFlight.current || isPaused) return;
        e.preventDefault();
        e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
}, [isPaused]);

// ─── Keyboard shortcuts
useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (isPaused) return;

        if (e.key === "ArrowRight") {
            if (currentIndex < totalQuestions - 1) setCurrent(currentIndex + 1);
        } else if (e.key === "ArrowLeft") {
            if (currentIndex > 0) setCurrent(currentIndex - 1);
        } else if (["1", "2", "3", "4"].includes(e.key)) {
            const k = ANSWER_KEYS[Number(e.key) - 1];
            if (k) selectAnswer(k);
        }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
}, [currentIndex, totalQuestions, setCurrent, selectAnswer, isPaused]);

// ─── Derived
const cur = states[currentIndex];
const curQuestion = cur?.questionId ? loaded[cur.questionId] : null;
const minutes = Math.floor(remaining / 60);
const seconds = remaining % 60;
const lowTime = remaining <= 5 * 60;
const criticalTime = remaining <= 30;
const offlineBannerText = formatOfflineBannerText(isOnline, 0);
const shouldBlurExamBody = isPaused || pausingVisual;

if (loading || !startedAt) {
    return <ExamSkeleton />;
}

if (error) {
    return (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
            <p className="text-amber-600">{error}</p>
            <button
                onClick={() => navigate("/dashboard")}
                className="btn-secondary mt-4"
            >
                Back to Dashboard
            </button>
        </div>
    );
}

return (
    <div className="flex min-h-screen flex-col bg-slate-50">
        <Seo title="Exam in Progress" description="Active UPCAT practice exam." noindex />
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
            {!isOnline && (
                <div className="bg-amber-500 px-4 py-1 text-center text-xs font-medium text-white">
                    {offlineBannerText}
                </div>
            )}
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Q {currentIndex + 1} of {totalQuestions}
                    </span>
                    {curQuestion && (
                        <span
                            className="hidden truncate rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 sm:inline-block"
                        >
                            {SUBJECT_META[curQuestion.subjectArea].icon}{". "}{SUBJECT_META[curQuestion.subjectArea].label}
                        </span>
                    )}
                </div>

                <div
                    className={`rounded-lg px-4 py-1.5 font-mono text-base font-bold tabular-nums ${criticalTime ? "bg-red-100 text-red-700 ring-2 ring-red-400 animate-pulse" : lowTime ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}
                    data-help="ex_timer"
                    aria-live="polite"
                    aria-label={`Time remaining: ${minutes}:${seconds}`}
                >
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>

                <div className="flex items-center gap-2">
                    {isPaused ? (
                        <button
                            type="button"
                            onClick={() => void handleResume()}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            Resume
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void handlePause()}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Pause
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => void handlePauseAndExit()}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Pause & Exit
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmSubmit(true)}
                        disabled={isPaused}
                        data-help="ex_finish_subtest"
                        className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                        Submit
                    </button>
                </div>
            </header>

            {isPaused && (
                <div className="mx-auto mt-4 w-full max-w-7xl px-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                        Exam is paused. Timer is stopped until you resume.
                    </div>
                </div>
            )}
        </div>
    </div>
);
<div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
    {/* Question column */}
    <div className="flex-1">
        {curQuestion ? (
            <article key={curQuestion.id} className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in transition ${shouldBlurExamBody ? "blur-sm" : ""}`}>
                > {curQuestion.passage && (
                    <PassagePanel
                        title={curQuestion.passage.title}
                        content={curQuestion.passage.content}
                        open={passageOpen}
                        onToggle={() => setPassageOpen((v) => !v)}
                    />
                )}
                <div className="prose max-w-none text-gray-900">
                    <MathText className="text-base leading-relaxed">{curQuestion.questionText}</MathText>
                </div>
                <ul className="mt-6 space-y-3">
                    {curQuestion.choices.map((choice) => {
                        const selected = cur?.answer === choice.label;
                        return (
                            <li key={choice.label}>
                                <button type="button" onClick={() => selectAnswer(choice.label)} disabled={isPaused} aria-pressed={selected} className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all ${selected ? "border-primary-600 bg-primary-50 ring-2 ring-primary-600" : "border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/40"} ${isPaused ? "cursor-not-allowed opacity-60" : ""}`}>
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>{selected ? "x" : choice.label}</span>
                                    <span className="flex-1 text-gray-800">{choice.text}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <button type="button" onClick={toggleFlag} disabled={isPaused} data-help="ex_flag" className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${cur?.flagged ? "border-orange-400 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"} ${isPaused ? "opacity-60" : ""}`} aria-pressed={cur?.flagged ?? false}>
                        {cur?.flagged ? "Marked for review" : "Mark for review"}
                    </button>
                    <div className="flex gap-2">
                        <button type="button" disabled={isPaused || currentIndex === 0} onClick={() => setCurrent(currentIndex - 1)} className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                            Previous
                        </button>
                        <button type="button" disabled={isPaused || currentIndex === totalQuestions - 1} onClick={() => setCurrent(currentIndex + 1)} className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40">
                            Next →
                        </button>
                    </div>
                </div>
            </article>
        ) : (
            <div className="flex justify-center py-20">
                <Spinner />
            </div>
        )}
    </div>
</div>
function QuestionNavigator({
  states,
  currentIndex,
  onJump,
}: {
  states: ReturnType<typeof useExamStore.getState>["states"];
  currentIndex: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-help="ex_question_grid">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Questions</h3>
        <Legend />
      </div>
      <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-5 max-h-[60vh] overflow-y-auto pr-1">
        {states.map(({ s, i }) => {
          const isCurrent = i === currentIndex;
          const cls = s.flagged
            ? "bg-orange-500 text-white"
            : s.answer !== null
              ? "bg-green-500 text-white"
              : s.visited
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700";
          return (
            <button key={i} type="button" onClick={() => onJump(i)} aria-label={`Question ${i + 1}`} aria-current={isCurrent ? "step" : undefined}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  const items: { color: string; label: string }[] = [
    { color: "bg-gray-200", label: "Not visited" },
    { color: "bg-blue-500", label: "Visited" },
    { color: "bg-green-500", label: "Answered" },
    { color: "bg-orange-500", label: "Flagged" },
  ];
}
];
return (
    <div className="hidden flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 lg:flex">
        {items.map((it) => (
            <span key={it.label} className="flex items-center gap-1">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${it.color}`}>{it.label}</span>
            </span>
        ))}
    </div>
);

function SubmitConfirmModal({
    answeredCount,
    totalQuestions,
    submitting,
    onCancel,
    onConfirm,
}: {
    answeredCount: number;
    totalQuestions: number;
    submitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const unanswered = totalQuestions - answeredCount;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog"
            aria-modal="true">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                <h2 className="text-lg font-semibold text-gray-900">Submit your exam?</h2>
                <p className="mt-2 text-sm text-gray-600">
                    You've answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
                    {unanswered > 0 && (
                        <span className="text-orange-600">{unanswered} unanswered</span> will be marked incorrect.</p>
                </p>
                <p className="mt-2 text-sm text-gray-500">This action is final and cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} disabled={submitting}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Keep working
                    </button>
                    <button type="button" onClick={onConfirm} disabled={submitting}
                        className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                        {submitting ? (
                            <>
                                <Spinner className="h-4 w-4 text-white" />
                                <span className="ml-2">Submitting...</span>
                            </>
                        ) : (
                            "Yes, submit"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExamSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
                <div className="mx-auto h-8 max-w-7xl animate-pulse rounded bg-gray-100" />
            </div>
            <div className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-6 px-4 lg:grid-cols-[1fr_18rem]">
                <div className="space-y-3">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                </div>
                <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
            </div>
        </div>
    );
}

// Hook: ticking elapsed seconds
function useElapsed(startedAt: number | null, isPaused: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!startedAt || isPaused) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [startedAt, isPaused]);
    return useMemo(() => {
        if (!startedAt) return 0;
        return Math.floor((now - startedAt) / 1000);
    }, [now, startedAt]);
}