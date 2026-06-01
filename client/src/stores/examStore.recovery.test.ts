import {beforeEach, describe, expect, it, vi} from "vitest";
import {apiClient} from "@/lib/api";
import {flushSessionQueue} from "@/lib/syncQueue";
import {checkServerStatus} from "@/lib/sessionRecovery";
import {useExamStore} from "@/stores/examStore";

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
}));

vi.mock("@/lib/sessionRecovery", () => ({
  saveSnapshot: vi.fn(),
  saveSnapshotNow: vi.fn(),
  checkServerStatus: vi.fn(),
}));

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys()[index])[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("examStore.recovery.reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("sessionStorage", new MemoryStorage());
    vi.stubGlobal("window", {});
    useExamStore.getState().reset();
  });

  it("merges recovered answers into local state on init", async () => {
    sessionStorage.setItem(
      "upcat_exam_runtime_v1",
      JSON.stringify({
        sessionId: "sess-1",
        totalQuestions: 1,
        timeLimit: 60,
        startedAt: Date.now(),
        currentIndex: 0,
        states: [
          {
            questionId: "q1",
            orderIndex: 0,
            subjectArea: "Mathematics",
            difficulty: "medium",
            visited: true,
            answer: "B",
            flagged: false,
            timeSpent: 10,
            dirty: true,
          },
        ],
      }),
    );

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: {
          questions: [
            {
              _id: "q1",
              type: "standalone",
              subjectArea: "Mathematics",
              difficulty: "medium",
              questionText: "1+1=?",
              choices: ["1", "2", "3", "4"],
              correctAnswer: "B",
              explanation: "basic",
              tags: [],
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              orderIndex: 0,
            }
          ]
        }
      }
    });
  });
passage: null,
userAnswer: null,
},
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
timerState: {remainingMs: 3_600_000, adjustments: 20_000},
maintenanceExtension: null,
});
vi.mocked(flushSessionQueue).mockResolvedValue(1);

await useExamStore.getState().init("sess-1");

const state = useExamStore.getState();
expect(state.states[0]?.answer).toBe("B");
expect(state.states[0]?.dirty).toBe(true);
expect(state.states[0]?.timeSpent).toBe(10);
expect(state.timerExtensionMs).toBe(20_000);
});

it("skips recovery call when there are no answered local questions", async () => {
vi.mocked(apiClient.get).mockResolvedValue({
data: {
data: {
questions: [
  {
    _id: "q1",
    type: "standalone",
    subjectArea: "Mathematics",
    difficulty: "medium",
    questionText: "1+1=?",
    choices: ["1", "2", "3", "4"],
    correctAnswer: "B",
    explanation: "basic",
    tags: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orderIndex: 0,
    passage: null,
    userAnswer: null,
  },
  ],
  totalQuestions: 1,
  session: {
    _id: "sess-2",
    status: "in_progress",
    timeLimit: 60,
    startedAt: new Date().toISOString(),
  },
  },
});
vi.mocked(checkServerStatus).mockResolvedValue(null);
vi.mocked(flushSessionQueue).mockResolvedValue(0);

await useExamStore.getState().init("sess-2");

expect(flushSessionQueue).not.toHaveBeenCalled();
});
```

it("merges only recovered questions and preserves unrecovered local answers", async () => {
sessionStorage.setItem(
"upcat_exam_runtime_v1",
JSON.stringify({
sessionId: "sess-3",
totalQuestions: 2,
timeLimit: 60,
startedAt: Date.now(),
currentIndex: 1,
states: [
{
questionId: "q1",
orderIndex: 0,
subjectArea: "Mathematics",
difficulty: "medium",
visited: true,
answer: "A",
flagged: false,
timeSpent: 11,
dirty: true,
},
{
questionId: "q2",
orderIndex: 1,
subjectArea: "Science",
difficulty: "medium",
visited: true,
answer: "D",
flagged: false,
timeSpent: 14,
dirty: true,
vi.mocked(apiClient.get).mockResolvedValue({
  data: {
    data: {
      questions: [
        {
          _id: "q1",
          type: "standalone",
          subjectArea: "Mathematics",
          difficulty: "medium",
          questionText: "q1",
          choices: ["1", "2", "3", "4"],
          correctAnswer: "B",
          explanation: "basic",
          tags: [],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          orderIndex: 0,
          passage: null,
          userAnswer: null,
        },
        {
          _id: "q2",
          type: "standalone",
          subjectArea: "Science",
          difficulty: "medium",
          questionText: "q2",
          choices: ["1", "2", "3", "4"],
          correctAnswer: "A",
          explanation: "basic",
          tags: [],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          orderIndex: 1,
          passage: null,
          userAnswer: null,
        },
        ],
        totalQuestions: 2,
        session: {
          _id: "sess-3",
          status: "in_progress",
          timeLimit: 60,
          startedAt: new Date().toISOString(),
        },
        },
        });
        vi.mocked(checkServerStatus).mockResolvedValue(null);
        vi.mocked(flushSessionQueue).mockResolvedValue(0);

        await useExamStore.getState().init("sess-3");

        const state = useExamStore.getState();
        expect(state.states[0]?.answer).toBe("A");
        expect(state.states[0]?.dirty).toBe(true);
        expect(state.states[1]?.answer).toBe("D");
        expect(state.states[1]?.dirty).toBe(true);
    });

    it("keeps larger server maintenance extension when recovered timer adjustment is smaller", async () => {
      sessionStorage.setItem(
        "upcat_exam_runtime_v1",
        JSON.stringify({
          sessionId: "sess-4",
          totalQuestions: 1,
          timeLimit: 60,
          startedAt: Date.now(),
          currentIndex: 0,
          states: [
            {
              questionId: "q1",
              orderIndex: 0,
              subjectArea: "Mathematics",
              difficulty: "medium",
              visited: true,
              answer: "A",
              flagged: false,
              timeSpent: 10,
              dirty: true,
            },
            ],
          },
        });
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: {
          questions: [
            {
              _id: "q1",
              type: "standalone",
              subjectArea: "Mathematics",
              difficulty: "medium",
              questionText: "q1",
              choices: ["1", "2", "3", "4"],
              correctAnswer: "B",
              explanation: "basic",
              tags: [],
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              orderIndex: 0,
              passage: null,
              userAnswer: null,
            },
            ],
            totalQuestions: 2,
            session: {
              _id: "sess-3",
              status: "in_progress",
              timeLimit: 60,
              startedAt: new Date().toISOString(),
              orderIndex: 1,
              passage: null,
              userAnswer: null,
            },
            ],
            },
        });
tags: [],
isActive: true,
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
orderIndex: 0,
passage: null,
userAnswer: null,
},
totalQuestions: 1,
session: {
  _id: "sess-4",
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
  timerState: {remainingMs: 3_600_000, adjustments: 50_000},
  maintenanceExtension: 50_000,
});
vi.mocked(flushSessionQueue).mockResolvedValue(0);

await useExamStore.getState().init("sess-4");

expect(useExamStore.getState().timerExtensionMs).toBe(50_000);
});