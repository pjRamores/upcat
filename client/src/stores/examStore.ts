import {create} from "zustand";
import apiClient from "@/lib/api";
import type {Difficulty, ExamQuestion, Passage, SubjectArea,} from "@upcat/shared";
import {API_ROUTES} from "@upcat/shared";
import {checkServerStatus} from "@/lib/sessionRecovery";
import {enqueueSessionAction, flushSessionActionQueue} from "@/lib/syncQueue";

export interface LoadedQuestion extends ExamQuestion {
  orderIndex: number;
  passage: Passage | null;
}

export type AnswerLetter = "A" | "B" | "C" | "D";

export interface QuestionState {
  questionId: string;
  orderIndex: number;
  subjectArea: SubjectArea;
  difficulty: Difficulty;
  /** Has the user navigated to this question at least once? */
  visited: boolean;
  /** Local user answer (synced to server). */
  answer: AnswerLetter | null;
  flagged: boolean;
  /** Cumulative seconds spent on this question (local). */
  timeSpent: number;
  /** Has the answer/timeSpent changed since last server sync? */
  dirty: boolean;
}

interface ExamState {
  sessionId: string | null;
  totalQuestions: number;
  timeLimit: number; // minutes
  startedAt: number | null; // ms epoch
  timerExtensionMs: number;
  isPaused: boolean;
  pausedAt: number | null;
  loaded: Record<string, LoadedQuestion>;
  states: QuestionState[];
  currentIndex: number;
  loading: boolean;
  submitting: boolean;
  error: string | null;

  init(sessionId: string): Promise<void>;

  loadPage(page: number): Promise<void>;

  ensureLoaded(orderIndex: number): Promise<void>;

  setCurrent(index: number): void;

  selectAnswer(letter: AnswerLetter): void;

  toggleFlag(): void;

  tick(seconds: number): void;

  flushDirty(): Promise<number>;

  pauseSession(): Promise<void>;

  resumeSession(): Promise<void>;

  submit(): Promise<void>;

  reset(): void;
}

const PAGE_SIZE = 25;
const EXAM_RUNTIME_KEY = "upcat_exam_runtime_v1";
const PERSIST_INTERVAL_MS = 5_000;
const PERSIST_DEBOUNCE_MS = 250;
let lastPersistAt = 0;
let persistDebounceHandle: number | null = null;

interface PersistedExamRuntime {
  sessionId: string | null;
  totalQuestions: number;
  timeLimit: number;
  startedAt: number | null;
  currentIndex: number;
  states: QuestionState[];
  timerExtensionMs?: number;
  isPaused?: boolean;
  pausedAt?: number | null;
}

function loadPersistedRuntime(): PersistedExamRuntime | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(EXAM_RUNTIME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedExamRuntime;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.states)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistRuntime(snapshot: PersistedExamRuntime): void {
if (typeof window === "undefined") return;
sessionStorage.setItem(EXAM_RUNTIME_KEY, JSON.stringify(snapshot));
}

function clearPersistedRuntime(): void {
if (typeof window === "undefined") return;
sessionStorage.removeItem(EXAM_RUNTIME_KEY);
}

function persistFromStore(get: () => ExamState): void {
const s = get();
persistRuntime({
sessionId: s.sessionId,
totalQuestions: s.totalQuestions,
timeLimit: s.timeLimit,
startedAt: s.startedAt,
currentIndex: s.currentIndex,
states: s.states,
timerExtensionMs: s.timerExtensionMs,
isPaused: s.isPaused,
pausedAt: s.pausedAt,
});
}

function persistFromStoreDebounced(get: () => ExamState): void {
if (typeof window === "undefined") {
persistFromStore(get);
return;
}
if (persistDebounceHandle !== null) {
window.clearTimeout(persistDebounceHandle);
}
persistDebounceHandle = window.setTimeout(() => {
persistDebounceHandle = null;
persistFromStore(get);
}, PERSIST_DEBOUNCE_MS);
}

function persistFromStoreThrottled(get: () => ExamState): void {
const now = Date.now();
if (now - lastPersistAt < PERSIST_INTERVAL_MS) return;
lastPersistAt = now;
persistFromStore(get);
}

function isTransientSyncError(error: unknown): boolean {
const maybe = error as { response?: { status?: number } };
const status = Number(maybe?.response?.status ?? 0);
if (!status) return true;
return status >= 500;
}

const persistedRuntime = loadPersistedRuntime();

export const useExamStore = create<ExamState>((set, get) => ({
sessionId: persistedRuntime?.sessionId ?? null,
totalQuestions: persistedRuntime?.totalQuestions ?? 0,
timeLimit: persistedRuntime?.timeLimit ?? 0,
startedAt: persistedRuntime?.startedAt ?? null,
timerExtensionMs: persistedRuntime?.timerExtensionMs ?? 0,
isPaused: persistedRuntime?.isPaused ?? false,
pausedAt: persistedRuntime?.pausedAt ?? null,
loaded: {},
states: persistedRuntime?.states ?? [],
currentIndex: persistedRuntime?.currentIndex ?? 0,
loading: false,
submitting: false,
error: null,
});

reset() {
set({
sessionId: null,
totalQuestions: 0,
timeLimit: 0,
startedAt: null,
timerExtensionMs: 0,
isPaused: false,
pausedAt: null,
loaded: {},
states: [],
currentIndex: 0,
loading: false,
submitting: false,
error: null,
});
clearPersistedRuntime();
},

async init(sessionId) {
if (get().sessionId === sessionId && get().states.length > 0) return;
const cached = loadPersistedRuntime();
if (cached?.sessionId === sessionId && cached.states.length > 0) {
set({
sessionId,
totalQuestions: cached.totalQuestions,
timeLimit: cached.timeLimit,
startedAt: cached.startedAt,
timerExtensionMs: cached.timerExtensionMs ?? 0,
isPaused: Boolean(cached.isPaused),
pausedAt: cached.pausedAt ?? null,
states: cached.states,
currentIndex: Math.max(0, cached.currentIndex),
});
}
set({loading: true, error: null, sessionId});
try {
  // Always load page 1 to bootstrap; we get totalQuestions in response.
  const {data} = await apiClient.get(
    `${API_ROUTES.EXAM.QUESTIONS(sessionId)}?page=1&limit=${PAGE_SIZE}`,
  );

  const payload = data.data as {
    questions: LoadedQuestion[];
    totalQuestions: number;
    session: {
      _id: string;
      status: string;
      timeLimit: number;
      startedAt: string | null;
      timerExtensionMs?: number;
      isPaused?: boolean;
      pausedAt?: string | null;
    };
  };

  // Initialise states array
  const states: QuestionState[] = Array.from(
    {length: payload.totalQuestions},
    (_, i) => ({
      questionId: "",
      orderIndex: i,
      subjectArea: "Mathematics",
      difficulty: "medium",
      visited: false,
      answer: null,
      flagged: false,
      timeSpent: 0,
      dirty: false
    }),
  );

  const loaded: Record<string, LoadedQuestion> = {};
  for (const q of payload.questions) {
    loaded[q._id] = q;
    const s = states[q.orderIndex];
    if (s) {
      s.questionId = q._id;
      s.subjectArea = q.subjectArea;
      s.difficulty = q.difficulty;
      // userAnswer comes back from server (auto-saved on prior loads)
      const ua = (q.as) as {userAnswer?: AnswerLetter | null}.userAnswer ?? null;
      s.answer = ua;
    }
  }

  // Merge in locally persisted runtime to preserve unsynced in-progress work.
  if (cached?.sessionId === sessionId && cached.states.length > 0) {
    for (let i = 0; i < states.length; i++) {
      const persisted = cached.states[i];
      const current = states[i];
      if (!persisted || !current) continue;

      if (!current.questionId && persisted.questionId) {
        current.questionId = persisted.questionId;
        current.subjectArea = persisted.subjectArea;
        current.difficulty = persisted.difficulty;
      }

      current.visited = current.visited || persisted.visited;
      current.flagged = persisted.flagged;
      current.timeSpent = Math.max(current.timeSpent, persisted.timeSpent ?? 0);

      if (persisted.answer && persisted.answer !== current.answer) {
        current.answer = persisted.answer;
        current.dirty = true;
      } else if (persisted.dirty) {
        current.dirty = true;
      }
    }
  }

  if (states[0]) states[0].visited = true;

  const restoredIndex =
    cached?.sessionId === sessionId
    ? Math.min(Math.max(cached.currentIndex, 0), Math.max(payload.totalQuestions - 1, 0))
    : 0;

  set({
    loaded,
    states,
    totalQuestions: payload.totalQuestions,
    timeLimit: payload.session.timeLimit,
    startedAt: payload.session.startedAt,
    ? new Date(payload.session.startedAt).getTime()
    : Date.now(),
    timerExtensionMs: Number(payload.session.timerExtensionMs ?? cached?.timerExtensionMs ?? 0),
    isPaused: Boolean(payload.session.isPaused),
    pausedAt: payload.session.pausedAt ?? new Date(payload.session.pausedAt).getTime() : null,
    currentIndex: restoredIndex,
    // Keep loading: true until ensureLoaded below finishes so the skeleton
    // covers the gap where curQuestion would still be null (page not fetched).
  });

  // Pre-load the page for the restored index before clearing the skeleton,
  // so the question panel is never blank when the skeleton first disappears.
  await get().ensureLoaded(restoredIndex);
  set({loading: false});
}
// Reconcile with server snapshot metadata and flush any durable queued answers.
try {
  const status = await checkServerStatus(sessionId);
  const extensionMs =
    status?.maintenanceExtension ?? status?.timerState?.adjustments ?? 0;
  if (typeof extensionMs === "number") && extensionMs > 0 && !get().isPaused) {
    set({timerExtensionMs: extensionMs});
  }
  // Local sessionStorage is the source of truth for answers during the exam.
} catch {
  // best-effort only; normal exam flow should continue
}

persistFromStore(get);
catch(e) {
  const msg =
    (e as {response?: {data?: {error?: string}}}).response?.data?.error ||
    "Failed to load exam";
  set({error: msg, loading: false});
}
},

async loadPage(page) {
  const {sessionId} = get();
  if (!sessionId) return;
  const {data} = await apiClient.get(
    `${API_ROUTES.EXAM.QUESTIONS(sessionId)}?page=${page}&limit=${PAGE_SIZE}`,
  );
  const payload = data.data as {questions: LoadedQuestion[]};
  set((s) => {
    const loaded = {...s.loaded};
    const states = [...s.states];
    for (const q of payload.questions) {
      loaded[q._id] = q;
      const st = states[q.orderIndex];
      if (st) {
        st.questionId = q._id;
        st.subjectArea = q.subjectArea;
        st.difficulty = q.difficulty;
        const ua = (q as unknown as {userAnswer?: AnswerLetter | null}).userAnswer ?? null;
        if (ua && !st.answer) st.answer = ua;
      }
    }
    return {loaded, states};
  });
  persistFromStore(get);
},

async ensureLoaded(orderIndex) {
  const {states, loaded} = get();
  const st = states[orderIndex];
  if (!st) return;
  if (st.questionId && loaded[st.questionId]) return;
  const page = Math.floor(orderIndex / PAGE_SIZE) + 1;
  await get().loadPage(page);
},

setCurrent(index) {
  set((s) => {
    if (index < 0 || index >= s.states.length) return s;
    const states = [...s.states];
    const target = states[index];
    if (target) states[index] = {...target, visited: true};
    return {currentIndex: index, states};
  });
  persistFromStoreDebounced(get);
  void get().ensureLoaded(index);
},

selectAnswer(letter) {
  set((s) => {
    const states = [...s.states];
    const existing = states[s.currentIndex];
    if (!existing) return s;
    // Clicking the already-selected choice deselects it (right-minus-wrong scoring).
    const newAnswer = existing.answer === letter ? null : letter;
    states[s.currentIndex] = {...existing, answer: newAnswer, dirty: true};
    return {states};
  });
  persistFromStoreDebounced(get);
},

toggleFlag() {
  set((s) => {
    const states = [...s.states];
    const existing = states[s.currentIndex];
    if (!existing) return s;
    states[s.currentIndex] = {...existing, flagged: !existing.flagged};
    return {states};
  });
  persistFromStoreDebounced(get);
},

tick(seconds) {
  set((s) => {
    if (s.isPaused) return s;
    const states = [...s.states];
    const existing = states[s.currentIndex];
    if (!existing) return s;
    states[s.currentIndex] = {
      ...existing,
      timeSpent: existing.timeSpent + seconds,
    };
  });
}
return {states};
});
persistFromStoreThrottled(get);
},

async flushDirty() {
  const {sessionId, states} = get();
  if (!sessionId) return 0;
  const dirty = states.filter((s) => s.dirty && s.questionId);
  if (dirty.length === 0) return 0;
  try {
    const {data} = await apiClient.post(
      API_ROUTES.EXAM.ANSWER_BULK(sessionId),
      {
        answers: dirty.map((d) => ({
          questionId: d.questionId,
          answer: d.answer,
          timeSpent: d.timeSpent,
        })),
      },
    );
    const dirtyIds = new Set(dirty.map((d) => d.questionId));
    set((s) => ({
      states: s.states.map((st) =>
        dirtyIds.has(st.questionId) ? {...st, dirty: false} : st,
      }),
    }));
    persistFromStore(get);
    return (data?.data?.count as number) ?? dirty.length;
  } catch {
    persistFromStoreThrottled(get);
    return 0;
  }
},

async pauseSession() {
  const {sessionId, isPaused} = get();
  if (!sessionId || isPaused) return;

  await get().flushDirty();

  const eventAtIso = new Date().toISOString();
  try {
    const {data} = await apiClient.post(`/exam/${sessionId}/pause`, {at: eventAtIso});
    const payload = (data?.data ?? {}) as {
      paused?: boolean;
      pausedAt?: string | null;
      timerExtensionMs?: number;
    };
    set({
      isPaused: Boolean(payload.paused),
      pausedAt: payload.pausedAt ? new Date(payload.pausedAt).getTime() : Date.now(),
      timerExtensionMs: Number(payload.timerExtensionMs ?? get().timerExtensionMs),
    });
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void flushSessionActionQueue(sessionId);
    }
    persistFromStore(get);
    return;
  } catch (error) {
    if (!isTransientSyncError(error)) throw error;
  }

  const fallbackPausedAt = Date.now();
  set({
    isPaused: true,
    pausedAt: fallbackPausedAt,
  });
    enqueueSessionAction(sessionId, "pause", new Date(fallbackPausedAt).toISOString());
    persistFromStore(get);
  },

async resumeSession() {
  const {sessionId, pausedAt: currentPausedAt, timerExtensionMs: currentExtensionMs} = get();
  if (!sessionId) return;

  const eventAt = Date.now();
  const eventAtIso = new Date(eventAt).toISOString();

  try {
    const {data} = await apiClient.post(`/exam/${sessionId}/resume`, {at: eventAtIso});
    const payload = (data?.data ?? {}) as {
      paused?: boolean;
      pausedAt?: string | null;
      timerExtensionMs?: number;
    };
    set({
      isPaused: Boolean(payload.paused),
      pausedAt: payload.pausedAt ? new Date(payload.pausedAt).getTime() : null,
      timerExtensionMs: Number(payload.timerExtensionMs ?? get().timerExtensionMs),
    });
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void flushSessionActionQueue(sessionId);
    }
    persistFromStore(get);
    // Ensure the current question's page is loaded so the question panel
    // never stays on the inner spinner after the blur lifts.
    await get().ensureLoaded(get().currentIndex);
    return;
  } catch (error) {
    if (!isTransientSyncError(error)) throw error;
  }

  const additionalPausedMs = currentPausedAt ? Math.max(0, eventAt - currentPausedAt) : 0;
set({
  isPaused: false,
  pausedAt: null,
  timerExtensionMs: currentExtensionMs + additionalPausedMs,
});
enqueueSessionAction(sessionId, "resume", eventAtIso);
persistFromStore(get);
await get().ensureLoaded(get().currentIndex);
},

async submit() {
  const {sessionId} = get();
  if (!sessionId) return;
  set({submitting: true, error: null});
  try {
    const flaggedQuestionIds = [...new Set(
      get().states
      .filter((q) => q.flagged && q.questionId)
      .map((q) => q.questionId),
    )];

    await get().flushDirty();
    const {data} = await apiClient.post(API_ROUTES.EXAM.SUBMIT(sessionId), {
      flaggedQuestionIds,
    });

    // Phase 12: stash the gamification reward so ResultsPage can replay it.
    const gamification = data?.data?.gamification;
    if (gamification && sessionId) {
      try {
        sessionStorage.setItem(
          `upcat.gamification_${sessionId}`,
        JSON.stringify(gamification),
      );
      } catch {
        /* sessionStorage.quota -- ignore */
      }
    }
    set({submitting: false});
    clearPersistedRuntime();
  } catch (e) {
    const msg =
      (e as {response?: {data?: {error?: string}}}).response?.data?.error ||
      "Failed to submit exam";
    set({error: msg, submitting: false});
    throw e;
  }
},
});