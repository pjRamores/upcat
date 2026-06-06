import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { SUBJECT_META, type SubjectArea } from "@upcat/shared";
import MathText from "@/components/MathText";
import Seq from "@/components/Seq";
import AdSlot from "@/components/AdSlot";
import Spinner from "@/components/Spinner";
import { type AnswerLetter, type LoadedQuestion, type QuestionState, useExamStore } from "@/stores/examStore";
import { useToastStore } from "@/stores/toastStore";

interface SubjectBatch {
    subject: SubjectArea;
    indices: number[];
    timeLimitMinutes: number;
}

interface BatchRuntime {
    currentBatchIdx: number;
    spentByBatch: Record<number, number>;
}

const BATCH_RUNTIME_PREFIX = "upcat_exam_batch_runtime_v1";

function runtimeKey(sessionId: string): string {
    return `${BATCH_RUNTIME_PREFIX}:${sessionId}`;
}

function loadBatchRuntime(sessionId: string): BatchRuntime | null {
    if (typeof window === "undefined") return null;
    try {
        const key = runtimeKey(sessionId);
        const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as BatchRuntime;
        if (!parsed || typeof parsed !== "object") return null;
        return {
            currentBatchIdx: Number.isFinite(parsed.currentBatchIdx) ? parsed.currentBatchIdx : 0,
            spentByBatch: parsed.spentByBatch ?? {},
        };
    } catch {
        return null;
    }
}

function persistBatchRuntime(sessionId: string, runtime: BatchRuntime): void {
    if (typeof window === "undefined") return;
    const key = runtimeKey(sessionId);
    const serialized = JSON.stringify(runtime);
    sessionStorage.setItem(key, serialized);
    localStorage.setItem(key, serialized);
}

function clearBatchRuntime(sessionId: string): void {
    if (typeof window === "undefined") return;
    const key = runtimeKey(sessionId);
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
}

function deriveSpentByBatchFromElapsedSeconds(
    batches: SubjectBatch[],
    elapsedSeconds: number,
): Record<number, number> {
    const safeElapsed = Math.max(0, Math.floor(elapsedSeconds));
    let remaining = safeElapsed;
    const spent: Record<number, number> = {};

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch) continue;
        const allotted = Math.max(0, Math.round(batch.timeLimitMinutes * 60));
        const used = Math.min(allotted, Math.max(0, remaining));
        spent[i] = used;
        remaining -= used;
    }

    return spent;
}

function deriveCurrentBatchIndexFromElapsedSeconds(
    batches: SubjectBatch[],
    elapsedSeconds: number,
): number {
    const safeElapsed = Math.max(0, Math.floor(elapsedSeconds));
    let consumed = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch) continue;
        const allotted = Math.max(0, Math.round(batch.timeLimitMinutes * 60));
        consumed += allotted;
        if (safeElapsed < consumed) return i;
    }

    return Math.max(0, batches.length - 1);
}

export default function BatchExamPage() {
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
  pausedAt,
  pauseSession,
  resumeSession,
  ensureLoaded,
} = useExamStore();

const [confirmSubmit, setConfirmSubmit] = useState(false);
const [confirmProceed, setConfirmProceed] = useState(false);
const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
const [timeoutTargetBatch, setTimeoutTargetBatch] = useState<number | null>(null);
const [currentBatchIdx, setCurrentBatchIdx] = useState(0);
const [spentByBatch, setSpentByBatch] = useState<Record<number, number>>({});
const [submitBlocking, setSubmitBlocking] = useState(false);

const submitInFlight = useRef(false);
const [pauseInFlight, setPauseInFlight] = useState(false);
const pauseInFlightRef = useRef(false);
const handleResumeRef = useRef(() => Promise<void>(async () => {}));

const shouldAutoResume = useMemo(
  () => new URLSearchParams(location.search).get("resume") === "1",
  [location.search],
);

const hydratedFromPersistedRuntimeRef = useRef(false);

useEffect(() => {
  if (!sessionId) return;
  void init(sessionId);
}, [sessionId, init]);

const subjectBatches: SubjectBatch[] = useMemo(() => {
  const grouped = new Map<SubjectArea, number[]>();

  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    if (!s) continue;
    const existing = grouped.get(s.subjectArea);
    if (existing) existing.push(i);
    else grouped.set(s.subjectArea, [i]);
  }

  const totalCount = Math.max(1, states.length);
  const totalSeconds = Math.max(0, Math.round(timeLimit * 60));

  return Array.from(grouped.entries()).map(([subject, indices]) => {
    const subjectSeconds = Math.max(
      60,
      Math.round((indices.length / totalCount) * totalSeconds),
    );
    return {
      subject,
      indices,
      timeLimitMinutes: Math.max(1, Math.ceil(subjectSeconds / 60)),
    };
  }, [states, timeLimit]);
}, [subjectBatches]);

const currentBatch = subjectBatches[currentBatchIdx] ?? null;
const isLastBatch = currentBatch ? currentBatchIdx === subjectBatches.length - 1 : false;

useEffect(() => {
  if (!sessionId) return;
  const runtime = loadBatchRuntime(sessionId);
  if (!runtime) return;
  hydratedFromPersistedRuntimeRef.current = true;
  setCurrentBatchIdx(runtime.currentBatchIdx);
  setSpentByBatch(runtime.spentByBatch ?? {});
}, [sessionId]);

const effectiveElapsedSeconds = useMemo(() => {
  if (!startedAt) return 0;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  let pausedExtension = Math.round(Math.max(0, timerExtensionMs) / 1000);
  // Also subtract the current pause duration (not yet reflected in timerExtensionMs
  // because that only updates on resume).
  if (isPaused && pausedAt) {
    pausedExtension += Math.round(Math.max(0, Date.now() - pausedAt) / 1000);
  }
  return Math.max(0, elapsed - pausedExtension);
}, [startedAt, timerExtensionMs, isPaused, pausedAt]);

useEffect(() => {
  // If we already loaded a persisted runtime from storage, never overwrite it
  // with an elapsed-time derivation. The stored value is the frozen source of truth for paused sessions and prevents a React same-commit race where this effect fires before the state update from loadBatchRuntime takes effect.
  if (hydratedFromPersistedRuntimeRef.current) return;
  if (subjectBatches.length === 0 || Object.keys(spentByBatch).length > 0) return;

const derivedSpent = deriveSpentByBatchFromElapsedSeconds(subjectBatches, effectiveElapsedSeconds);
if (Object.keys(derivedSpent).length === 0) return;

setSpentByBatch(derivedSpent);
setCurrentBatchIdx(deriveCurrentBatchIndexFromElapsedSeconds(subjectBatches, effectiveElapsedSeconds));
}, [subjectBatches, spentByBatch, effectiveElapsedSeconds]);

useEffect(() => {
    if (subjectBatches.length === 0) return;
    setCurrentBatchIdx((prev) => Math.min(Math.max(prev, 0), subjectBatches.length - 1));
}, [subjectBatches.length]);

useEffect(() => {
    if (!sessionId) return;
    // Guard: never write an empty spentByBatch to storage that would overwrite
    // a valid stored runtime with blank data (the initial React state before
    // loadBatchRuntime has had a chance to apply its state update).
    if (Object.keys(spentByBatch).length === 0) return;
    persistBatchRuntime(sessionId, { currentBatchIdx, spentByBatch });
}, [sessionId, currentBatchIdx, spentByBatch]);

useEffect(() => {
    if (!currentBatch) return;
    const idxInside = currentBatch.indices.indexOf(currentIndex);
    if (idxInside >= 0) return;
    const batchFromCurrentIndex = subjectBatches.findIndex((b) => b.indices.includes(currentIndex));
    if (batchFromCurrentIndex >= 0 && batchFromCurrentIndex !== currentBatchIdx) {
        setCurrentBatchIdx(batchFromCurrentIndex);
        return;
    }
    const first = currentBatch.indices[0];
    if (typeof first === "number") setCurrent(first);
}, [currentBatch, currentBatchIdx, currentIndex, setCurrent, subjectBatches]);

useEffect(() => {
    if (!currentBatch) return;

    const currentPos = currentBatch.indices.indexOf(currentIndex);
    if (currentPos < 0) return;

    const prev = currentBatch.indices[currentPos - 1];
    const next = currentBatch.indices[currentPos + 1];

    if (typeof prev === "number") {
        void ensureLoaded(prev);
    }
    if (typeof next === "number") {
        void ensureLoaded(next);
    }
}, [currentBatch, currentIndex, ensureLoaded]);

useEffect(() => {
    if (!currentBatch || isPaused || submitBlocking) return;
    const id = window.setInterval(() => {
        tick(1);
        setSpentByBatch((prev) => ({
            ...prev,
            [currentBatchIdx]: (prev[currentBatchIdx] ?? 0) + 1,
        }), 1000);
    }, [currentBatch, currentBatchIdx, isPaused, submitBlocking, tick]);

const remainingSeconds = useMemo(() => {
    if (!currentBatch) return 0;
    const allotted = Math.round(currentBatch.timeLimitMinutes * 60);
    const spent = spentByBatch[currentBatchIdx] ?? 0;
    return Math.max(0, allotted - spent);
}, [currentBatch, currentBatchIdx, spentByBatch]);

useEffect(() => {
    if (!currentBatch || isPaused || remainingSeconds > 0 || showTimeoutDialog) return;
    setTimeoutTargetBatch(currentBatchIdx);
    setShowTimeoutDialog(true);
}, [currentBatch, currentBatchIdx, isPaused, remainingSeconds, showTimeoutDialog]);

const doSubmit = useCallback(async () => {
    if (!sessionId || submitInFlight.current) return;
    submitInFlight.current = true;
    flushSync(() => {
        setSubmitBlocking(true);
        setConfirmSubmit(false);
        setShowTimeoutDialog(false);
        setConfirmProceed(false);
    });
    try {
        await submit();
        clearBatchRuntime(sessionId);
        addToast("success", "Exam submitted!");
        reset();
        navigate(`/results/${sessionId}`, { replace: true });
    } catch {
        addToast("error", "Submission failed. Please try again.");
        submitInFlight.current = false;
        setSubmitBlocking(false);
    }
}, [sessionId, submit, addToast, reset, navigate]);

const moveToNextSubject = useCallback(() => {
    if (!currentBatch || isLastBatch) return;
    const next = currentBatchIdx + 1;
    const nextBatch = subjectBatches[next];
    if (!nextBatch || nextBatch.indices.length === 0) return;
const firstNextIndex = nextBatch.indices[0];
if (typeof firstNextIndex !== "number") return;
// Reset spent time for the next batch so it starts fresh from its full allotment.
setSpentByBatch((prev) => ({ ...prev, [next]: 0 }));
setCurrentBatchIdx(next);
setCurrent(firstNextIndex);
}, [currentBatch, isLastBatch, currentBatchIdx, subjectBatches, setCurrent]);

const handlePause = useCallback(async () => Promise<boolean> => {
    if (pauseInFlightRef.current) return false;
    pauseInFlightRef.current = true;
    setPauseInFlight(true);
    try {
        if (!isPaused) await pauseSession();
        addToast("info", "Exam paused.");
        return true;
    } catch {
        addToast("error", "Could not pause exam.");
        return false;
    } finally {
        pauseInFlightRef.current = false;
        setPauseInFlight(false);
    }
}, [isPaused, pauseSession, addToast]);

const handleResume = useCallback(async () => {
    if (pauseInFlightRef.current) return;
    pauseInFlightRef.current = true;
    setPauseInFlight(true);
    try {
        await resumeSession();
        addToast("success", "Exam resumed.");
    } catch {
        addToast("error", "Could not resume exam.");
    } finally {
        pauseInFlightRef.current = false;
        setPauseInFlight(false);
    }
}, [resumeSession, addToast]);

useEffect(() => {
    handleResumeRef.current = handleResume;
}, [handleResume]);

const handlePauseAndExit = useCallback(async () => {
    const ok = await handlePause();
    if (!ok) return;
    navigate("/dashboard");
}, [handlePause, navigate]);

useEffect(() => {
    if (!shouldAutoResume || !isPaused) return;
    void handleResumeRef.current();
}, [shouldAutoResume, isPaused]);

const currentState = states[currentIndex] ?? null;
const currentQuestion = currentState ? loaded[currentState.questionId] : null;
const indexInBatch = currentBatch ? currentBatch.indices.indexOf(currentIndex) : -1;

const canGoPrevInSubject = indexInBatch > 0;
const canGoNextInSubject = currentBatch ? indexInBatch >= 0 && indexInBatch < currentBatch.indices.length - 1 : false;

function goPrevInSubject() {
    if (!currentBatch || !canGoPrevInSubject) return;
    const target = currentBatch.indices[indexInBatch - 1];
    if (typeof target === "number") setCurrent(target);
}

function goNextInSubject() {
    if (!currentBatch || !canGoNextInSubject) return;
    const target = currentBatch.indices[indexInBatch + 1];
    if (typeof target === "number") setCurrent(target);
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
            <h1 className="text-2xl font-semibold text-slate-900">Exam unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button type="button" onClick={() => navigate("/dashboard")}>
                <div className="mx-auto max-w-xl px-4 py-16 text-center">
                    <Spinner />
                </div>
            </button>
        </div>
    );
}

if (!currentBatch) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner />
        </div>
    );
}
const nextBatch = !isLastBatch ? subjectBatches[currentBatchIdx + 1] : null;
const currentSubjectName = SUBJECT_META[currentBatch.subject]?.label ?? currentBatch.subject;
const timeoutSubject =
    timeoutTargetBatch !== null ? subjectBatches[timeoutTargetBatch] : null;
const timeoutSubjectLabel = timeoutSubject
    ? (SUBJECT_META[timeoutSubject.subject]?.label ?? timeoutSubject.subject)
    : "this subject";

return (
    <div className="mx-auto max-w-7xl px-4 py-8">
        <Seo title={`${Mock Exam} ${currentSubjectName}`} noindex/>

        {submitBlocking && (
            <div>
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-xl">
                        <Spinner className="h-5 w-5"/>
                        <span className="text-sm font-semibold text-slate-800">Submitting exam...</span>
                    </div>
                </div>
        )}

        {showTimeoutDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                    <h2 className="text-lg font-semibold text-slate-900">Time is up</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        {timeoutTargetBatch !== null
                            ? `The allotted time for ${timeoutSubjectLabel} has ended.`
                            : "The allotted time for this subject has ended."}
                    </p>
                    <button type="button" onClick={() => {
                        setShowTimeoutDialog(false);
                        if (isLastBatch) {
                            void doSubmit();
                        } else {
                            moveToNextSubject();
                        }
                    }}>
                        OK
                    </button>
                </div>
            </div>
        )}

        {confirmProceed && nextBatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                    <h2 className="text-lg font-semibold text-slate-900">Proceed to {SUBJECT_META[nextBatch.subject]?.label}?</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        You are about to move on to the next subject. Once you proceed, you{"."}
                        <strong>cannot go back</strong> to{"."}
                        <strong>{currentSubjectName}</strong>. The timer will reset to the
                        allotted time for {SUBJECT_META[nextBatch.subject]?.label}.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <button type="button" onClick={() => setConfirmProceed(false)}
                                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Stay here
                        </button>
                        <button type="button" onClick={() => {
                            setConfirmProceed(false);
                            moveToNextSubject();
                        }}
                                className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                            Proceed
                        </button>
                    </div>
                </div>
            </div>
        )}

        {confirmSubmit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                    <h2 className="text-lg font-semibold text-slate-900">Submit exam now?</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        You can submit even if some questions or subjects are unfinished.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <button type="button" onClick={() => setConfirmSubmit(false)}
                                disabled={submitting || submitBlocking}
                                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Cancel
                        </button>
                        <button type="button"
onClick={() => void doSubmit()}
disabled={submitting || submitBlocking}
className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
>
  {submitting || submitBlocking ? (
    <span className="inline-flex items-center gap-2">
      <Spinner className="h-4 w-4 text-white" />
      Submitting...
    </span>
  ) : (
    "Submit"
  )}
</button>
</div>
</div>

<div className="grid-gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
<section>
  <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject {currentBatchIdx + 1} of {subjectBatches.length}</p>
        <h1 className="text-lg font-semibold text-slate-900">{currentSubjectName}</h1>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">Time remaining</p>
        <p className={`text-2xl font-bold ${remainingSeconds <= 30 ? "text-rose-600" : "text-slate-900"}`}>{formatSeconds(remainingSeconds)}</p>
      </div>
    </div>
  </div>

  {isPaused && (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/60">
      <span className="text-sm font-semibold text-slate-500">Exam paused</span>
    </div>
  )}

  {!currentQuestion || !currentState ? (
    <div className="flex min-h-[300px] items-center justify-center">
      <Spinner />
    </div>
  ) : (
    <QuestionCard
      state={currentState}
      question={currentQuestion}
      questionPosition={indexInBatch + 1}
      questionCount={currentBatch.indices.length}
      onSelectAnswer={selectAnswer}
      onToggleFlag={toggleFlag}
      reviewDisabled={isPaused}
    />
  )}
</div>

<aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
<h2 className="text-sm font-semibold text-slate-900">Navigator</h2>
<p className="mt-1 text-xs text-slate-500">Showing active subject only.</p>

<div className="mt-4">
  <div className="rounded-lg border border-slate-200 p-3">
    <div className="mb-2 flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{currentSubjectName}</span>
      <span className="text-[11px] font-medium text-primary-700">Current</span>
    </div>
    <div className="grid grid-cols-5 gap-2">
      {currentBatch.indices.map((qIdx, positionInBatch) => {
        const st = states[qIdx];
        const answered = Boolean(st?.answer);
        const visited = Boolean(st?.visited);
        const flagged = Boolean(st?.flagged);
        const active = qIdx === currentIndex;
        const colorClass = active
          ? "bg-primary-600 text-white"
          : answered
            ? "bg-emerald-100 text-emerald-700"
            : visited
              ? "bg-sky-100 text-sky-700"
              : "bg-slate-100 text-slate-400";
        return (
          <button
            key={qIdx}
            type="button"
            disabled={isPaused}
            onClick={() => setCurrent(qIdx)}
            className={`relative h-8 rounded-md text-xs font-semibold ${colorClass} disabled:cursor-not-allowed disabled:opacity-60`}
            title={flagged ? `Question ${positionInBatch + 1} — marked for review` : `Question ${positionInBatch + 1}`}
          >
            {positionInBatch + 1}
            {flagged && (
              <span
                className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400"
                title="Mark for review"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
                  <path d="M18.597 6.597a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-3 3v2h2V10H7v2h2v2z" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
</aside>
<div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
  <span className="inline-block h-3 w-3 rounded-sm bg-primary-600">Current</span>
  <span className="flex items-center gap-1">Answered</span>
  <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-300">Visited</span>
  <span className="flex items-center gap-1">Not visited</span>
  <span className="inline-block h-3 w-3 rounded-full bg-amber-400">For review</span>
</div>

<div className="mt-4 space-y-2">
  <div className="grid grid-cols-2 gap-2">
    <button type="button" onClick={goPrevInSubject} disabled={!canGoPrevInSubject || isPaused} className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
    <button type="button" onClick={goNextInSubject} disabled={!canGoNextInSubject || isPaused} className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
  </div>

  {!isPaused ? (
    <button type="button" onClick={() => void handlePause()} disabled={pauseInFlight} className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Pause</button>
  ) : (
    <button type="button" onClick={() => void handleResume()} disabled={pauseInFlight} className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Resume</button>
  )}

  <button type="button" onClick={() => void handlePauseAndExit()} disabled={pauseInFlight} className="w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">Exit</button>

  {!isLastBatch && (
    <button type="button" onClick={() => setConfirmProceed(true)} disabled={isPaused} className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">Proceed to {SUBJECT_META[nextBatch?.subject ?? currentBatch.subject]?.label}</button>
  )}

  <button type="button" onClick={() => setConfirmSubmit(true)} disabled={submitting || submitBlocking || isPaused} className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
    {submitting || submitBlocking ? "Submitting..." : "Submit Now"}
  </button>
</div>

<div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
  <p>Total questions: {totalQuestions}</p>