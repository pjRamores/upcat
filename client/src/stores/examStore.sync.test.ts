import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@lib/api";
import { enqueueSessionAction, flushSessionActionQueue } from "@lib/syncQueue";
import { checkServerStatus } from "@lib/sessionRecovery";
import { useExamStore } from "@stores/examStore";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/lib/syncQueue", () => ({
  enqueueAnswer: vi.fn(),
  clearSessionQueue: vi.fn(),
  flushSessionQueue: vi.fn(),
  enqueueSessionAction: vi.fn(),
  flushSessionActionQueue: vi.fn(),
}));

vi.mock("@/lib/sessionRecovery", () => ({
  saveSnapshot: vi.fn(),
  saveSnapshotNow: vi.fn(),
  checkServerStatus: vi.fn(),
}));

function makeTransientError() {
  return { response: { status: 500 } };
}

const baseQuestion = {
  _id: "q1",
  type: "standalone" as const,
  subjectArea: "Mathematics" as const,
  difficulty: "medium" as const,
  questionText: "1 + 1 = ?",
  choices: ["1", "2", "3", "4"],
  correctAnswer: "B" as const,
  explanation: "basic",
  tags: [],
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  orderIndex: 0,
  passage: null,
};

describe("examStore.sync.integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", { online: true });
    useExamStore.getState().reset();
  });

  it("does not expose deprecated syncOfflineAnswers API", () => {
    expect((useExamStore.getState() as unknown as {
      syncOfflineAnswers?: unknown
    }).syncOfflineAnswers).toBeUndefined();
  });

  it("init applies maintenance extension", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        questions: [baseQuestion],
        totalQuestions: 1,
        session: {
          _id: "sess-1",
          status: "in_progress",
          timeLimit: 60,
          startedAt: new Date().toISOString(),
        },
      },
    });
    vi.mocked(checkServerStatus).mockResolvedValue({
      status: "in_progress",
      serverAnswerCount: 0,
      lastServerUpdate: null,
      timerState: { remainingMs: 3_600_000, adjustments: 45_000 },
      maintenanceExtension: 45_000,
    });
    await useExamStore.getState().init("sess-1");

    const state = useExamStore.getState();
    expect(state.timerExtensionMs).toBe(45_000);
  });

  it("submit flushes dirty answers and posts submit payload", async () => {
    const flushDirtyMock = vi.fn().mockResolvedValue(1);
    vi.mocked(apiClient.post).mockResolvedValue({ data: { gamification: null } });

    useExamStore.setState({
      sessionId: "sess-1",
      currentIndex: 0,
      totalQuestions: 1,
      timeLimit: 60,
      startedAt: Date.now(),
      states: [
        {
          questionId: "q1",
          orderIndex: 0,
          subjectArea: "Mathematics",
difficulty: "medium",
visited: true,
answer: "A",
flagged: false,
timeSpent: 12,
dirty: false,
},
],
flushDirty: flushDirtyMock,
});

await useExamStore.getState().submit();

expect(flushDirtyMock).toHaveBeenCalledTimes(1);
expect(apiClient.post).toHaveBeenCalledWith("/exam/sess-1/submit", {
flaggedQuestionIds: [],
});

const flushDirtyOrder = flushDirtyMock.mock.invocationCallOrder[0] ?? 0;
const submitOrder = vi.mocked(apiClient.post).mock.invocationCallOrder[0] ?? 0;

expect(flushDirtyOrder).toBeLessThan(submitOrder);
});

it("pause and resume replay queued actions when online", async () => {
vi.mocked(apiClient.post).mockResolvedValue({data: {data: {paused: true, timerExtensionMs: 0}}});
vi.mocked(flushSessionActionQueue).mockResolvedValue(1);

useExamStore.setState({
sessionId: "sess-1",
isPaused: false,
states: [
{
questionId: "q1",
orderIndex: 0,
subjectArea: "Mathematics",
difficulty: "medium",
visited: true,
answer: "A",
flagged: false,
timeSpent: 5,
dirty: false,
},
],
});

await useExamStore.getState().pauseSession();
await useExamStore.getState().resumeSession();

expect(apiClient.post).toHaveBeenCalledWith("/exam/sess-1/pause", expect.any(Object));
expect(apiClient.post).toHaveBeenCalledWith("/exam/sess-1/resume", expect.any(Object));
expect(enqueueSessionAction).not.toHaveBeenCalled();
expect(flushSessionActionQueue).toHaveBeenCalled("sess-1");
});

it("queues pause action when pause sync has transient failure", async () => {
vi.mocked(apiClient.post).mockRejectedValue(makeTransientError());

useExamStore.setState({
sessionId: "sess-2",
isPaused: false,
pausedAt: null,
timerExtensionMs: 0,
states: [
{
questionId: "q1",
orderIndex: 0,
subjectArea: "Mathematics",
difficulty: "medium",
visited: true,
answer: "A",
flagged: false,
timeSpent: 5,
dirty: false,
},
],
});

await useExamStore.getState().pauseSession();

const state = useExamStore.getState();
expect(state.isPaused).toBe(true);
expect(state.pausedAt).not.toBeNull();
expect(enqueueSessionAction).toHaveBeenCalledWith(
"sess-2",
"pause",
expect.any(String),
);
expect(flushSessionActionQueue).not.toHaveBeenCalled();
});

it("queues resume action and applies paused duration when resume sync has transient failure", async () => {
vi.mocked(apiClient.post).mockRejectedValue(makeTransientError());
const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);

useExamStore.setState({
sessionId: "sess-3",
isPaused: true,
pausedAt: 995_000,
timerExtensionMs: 1_000,
states: [
{
questionId: "q1",
orderIndex: 0,
subjectArea: "Mathematics",
difficulty: "medium",
visited: true,
answer: "A",
flagged: false,
timeSpent: 5,
dirty: false,
],

await useExamStore.getState().resumeSession();

const state = useExamStore.getState();
expect(state.isPaused).toBe(false);
expect(state.pausedAt).toBeNull();
expect(state.timerExtensionMs).toBe(6_000);
expect(enqueueSessionAction).toHaveBeenCalledWith(
    "sess-3",
    "resume",
    expect.any(String),
);
expect(flushSessionActionQueue).not.toHaveBeenCalled();

nowSpy.mockRestore();
});
```