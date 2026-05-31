import {beforeEach, describe, expect, it, vi} from "vitest";
import {apiClient} from "@/lib/api";
import {flushSessionQueue} from "@/lib/syncQueue";
import {checkServerStatus} from "@/lib/sessionRecovery";
import {useExamStore} from "@/stores/examStore";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  })),
});

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

```typescript
merges-only-recovered-questions-and-preserves-unrecovered-local-answers", async () => {
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
      }
    ]
  })
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
        vi.mocked(apiClient.get).mockResolvedValue({
          data: {
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
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                  userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                userAnswer: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                ],
                totalQuestions: 2,
                session: {
                  _id: "sess-3",
                  status: "in_progress",
                  timeLimit: 60,
                  startedAt: new Date().toISOString(),
                  orderIndex: 0,
                  passage: null,
                },
                ],
                ],
                },
                },
                null,        toweisen
        </tr>
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <td>        <td>        {td>        <td>        <td>        <td>        <td>        {title
    <tr>
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {title: "text{*        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        <td>nothing: 
        {
        {
        {
        {
        {
        {
        {
        <td>nature: 
        {
        <td>nature: 
        <td>3.0: 
        {
    </tr>
    </tr>
    {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {name: 
        {
        <td>New Yorkshire, "text: "a
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {title: "text: `{text: "a
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <tr: "text: 
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <tr: "text: `text: `text: `text: `text: `text: `text: 
        {
        {
    </td>        {
    </td>
    </tr>
    {
        {
        {
        {
        {
        {
        {
        {
        {
        {name: "text: 
        {name: "text: 
        {name: `text: 
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <tr: `text: `text: `text: {text: {text: {name: `text: {name: {name: {name: 
        {
      {
      {
      {
      {
      {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <td>a: `text: `text: a: a: a: 
        {name: `{text: 
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <tr: "text: `text: `text: `text: `text: 
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <tr: "text: `text: {name: `text: `text: 
        {
    <tr: `text: `text: `text: {text: `text: `text: {name: {name: {name: {name: a: 
        {
    <tr: "text: `text: {name: name: `text: {name: {name: {name: {name: {name: {name:{it: `text: `text: {name: `text: {name: `text: `text: {name: 
        {
    <tr: `text: `text: `name: name: `name: 
        {
        {
        {
        {
        {
    <tr: `text: a: a: a: a: 
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {name: a: a: a: a: a: a: a: 
        {
    <tr: a: a: a: a: a: a: a: a: 
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <tr: a: a: a: a: a: a: a: a: a: 
        {
    <tr: a: a: a: a: a: a: a: a: a: a: {name: a: a: a: a: a: a: a: a: a: a: a: a: a: 
        {
    <tr: a: a: a: a: a: a: a: 
    <tr: a: a: a: a: a: a: 
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
    <tr: a: a: a: a: a: a: a: a: 
        {
        {
        {
        {
        {
    <tr: a: a: a: a: a: a: a: a: a
        {
        {
    <tr: a: a: a: a: a: a: a: a: a: 
    <tr: a: a: a: a: a: a: a: a: a: a: a: 
    {name: a: 
    <tr: a: a: a: a: a: 
      {name: `{text: 
    <tr: a: a: a: a: a
    <tr: a: a: a: a
    <tr: a: a: a: a: a: a: a: a: a: {name: "text: a: a: a
    <tr: a: a: a: a: a: a: a: a: a: a: {name: "text: a: 
    <tr: a: a: a: a: a: a: a: a: a: 
    {name: "text: a
    <tr>
    <tr: a: a: a: a: a: a: a: a: 
    <tr: a: a: a: a: a: a: a
    <tr: a: a: a: a: a: a: a: a: a: a: a
    <tr: a: a: a: {name: `name: `name: `name: `{text: a: a: a: {name: `name: `name: {name: {name: `name: `name: {name: `name: 
    <tr>
        <tr: a: a: a: a: {name: `name: a
    <tr>
        {
        {
        {
        {
        {
    <tr>
    <tr>
    <tr>
    <tr: a: {name: {name: "text: `name: a: 
```{a: a: 
    <tr>
    <tr>
        {name: `name: `name: "name: {name: "name: "name: 
    <tr>
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        {
        <tr>
        {
        {
        {
        {
        {
        {
    <tr>
        {
        {
    <tr: "text: a: a: 
        {name: `name: {name: {A
        <tr>
        {name: `name: `name: `{name: {name: {name: 
    <tr>
        <tr>
        <tr>
        <tr>
        <tr>
        {name: `name: a: a: a: a: 
    <tr>
        <tr>
        {name: `name: {name: `{text: a
    <tr>
        <tr: a: a: a: 
    <tr>
        {name: a: a: 
    <tr>
        <tr: "text: a: a: a: 
    <tr>
        {name: a: a: 
    <tr: a: a: a: a: 
    <tr: a: a: a: a: {name: {a
        {name: 
        {name: 
    <tr>
        <tr: a: a: a: 
    <tr: a: a: a: a: 
    <tr: a: a: a: a: a: 
*        {name: `name: `[... 
    <tr>
    <tr: a: a: a: a: 
    <tr: a: a: a: a: 
    <tr: a: a: a: a: 
*name: `[... 
    <tr: a: a: a: 
    <tr: a: a: a: null, "name: 
    <tr: a: a: a: a
    <tr: a: 
    <tr: a:2
    <tr: a: null, "name: {name: {name: {@
        <tr>
    <tr: a: a: a: a: a
    <tr>
    <tr: a: a: a: a: a: 
    <tr>
    <tr: a: null, "name: a
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr: a: a: 
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
        <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
        <tr>
    <tr>
        <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
        <tr>
    <tr>
        <tr>
        <tr>
        <tr>
    <tr>
        <tr>
        <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr, "text: "text: `{... `name: {@},{... `{... `{... `name: 
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr: {name: `name: `{name: `[...{...{... {...{...{...{...{...{* {name: 
    <tr>
    <tr: "text: `{text: `{...{...{...{...{... 
    <tr>
    {name
    {name: {name: {...{...{...{*{...{* {name: 
    <tr>
    <tr: {name: {name: {tr: {name: {tr: {name: 
    <tr>
    <tr: {name: {name: {name: 
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
      <tr>
    <tr>
      <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    {name: "textured
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
      <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
      <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
      <tr>
    <tr>
    <tr>
    <tr
      <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
      <tr>
      <tr>
    <tr>
    <tr>
    <tr>
    <tr>
      <tr>
    <tr>
    <tr>
    {name:      <tr>
      <tr>
      <tr>
    <tr>
    <tr>
    {name: "text: "text: 
    <td>{
    <td>{
    <tr>
    {name: td: "text: "text
    <tr>
    {name: 
    <tr>
    "text: td: "text: td: <td>{
    <td>
    <td>* td
    <tr>
    {name: {name: td: "text: "un
    <tr>
    <tr>
      <tr>
    <tr>
    {name: {name: `{nature: "text: {text: "text: {text: {tr>
    <tr>
    {name: td: 
    {tr
    {name: {name: td>{
    <td>{
    {read
    <tr>
    {name: {it
    <tr>
    {name: {name: {tr
    {name: {tr
    {name: 
    <tr>
    {name: td>{
    <tr>
    {name: {name: td>      <tr>
    <tr>
    <tr>
      <tr>
    {name: td
    <tr
    {name: td> {...{...{...{...{...{tr
    <tr>
    {name: {tr
    <tr
    {name: {...{...{td>    <td>* {...{...{...{...{...{...{...{...{...{...{...{...{tr
    <tr>
    {name: {name: td>
    <tr>
    <tr{image, "text: {text: {text: {...{...{tr
    <tr
    {name: {image
    <tr>
    {name: td: td
    "text: td
    <tr>
    <tr>
    <tr{#<tr>
    <tr>
    <tr>
    <tr>
    <tr{#<tr
    <tr
    <tr
    <tr
    <tr>
    <tr
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr>
    <tr
    {name: td: "name: td: td: "text: td>
    <td>      <td>
    "text: {tr>
    {name: td>{
    <tr>
    <tr>
    {name: td>
    "text: 
    "text: "at
    <td>{
    <td>{
    <td>{
    "at
    <tr>
    "text: {tr>
    <tr>
    "text: {tr>
    {name:{tr>
    {name:{tr>
    {name:{tr>
    {name: {name:{tr>
    {name: {tr>
    {name: td>{
    <tr>
    <tr>
    {name: td>    <tr{td>        {name:{tr>
    {name:{tr>
    {name:{tr>
    {name:{tr>
    <tr>
    {name:{tr>
    {name:{tr>
    <tr
    <tr
    <tr>
    {name: td>    <tr>
    {name:{tr>
    <tr>
    {name: td>      {name
    <tr>
    {name:{tr>
    {name:{value
    <tr>
    "text: {name: {value: {name
    <tr>
    {name: {name: 
    <td>{td>{
    <td>
    {it
    "un
    <td>
    <td>      <td>
    <td>      <td>      <td>      <td>{
    {it
    <tr>
    {name:{tr>
    {name{|td>{
    {it
    {m
    {name{tr>
    {name:{it
```{td>{
    <td>{tr
    {name:{tr
    {name:{tr>
    <tr
    {name{tr>
    {name{tr
    {name{tr
    {name{tr
    {name{tr
    {name{tr
      <tr
    {name: {tr
    {name: {tr
    {name: {tr
    {name: {tr>
    {name: "name: "th
      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>
      <td>
    <td>      <td>      <td>      <td>      <td>
    {name
    {name: 
    {name
    {name: 
    <td>      <td>      <td>      <td>      <td>      <td>      <td>      <td>
      <td>
      "read. 
    {it
    {name{td>
    {it
    {name
    "text
    {at
    {at
    {name{td>
    {at
    "text
    {name
    {text
    "read
    "text
    {text
    {name
    {name
    <td>{
    <td>      <td>
    {text
    "text
    {text
    "text
    <td>
    "text
    <td>      <td>      <td>      <td>      <td>
    "read
    <td>      <td>      "text
    <td>      <td>      "text
    "text
    "text
    {text
    {text
    {text
    "text
    {text
    {text
    <td>
    <td>
    <td>
    <td>
    <td
    <td>
    {name
    {text
    <td>
    {name
    <td>
    <td>
    "text
    "text
      <td>
    "text
    <td>
    "text
    "text
    "text
    {name
    <td>
    "text
    "text
    <td>      <td>
    "text
* {text
    "text
    <td>
    <td>
* {text
    <td>
    <td>
    <td>
    <td>      <td>
    "text
    <td>      <td>      <td>
    <td>
    <td>
    <td>      <td>
    <td>
    <td>
    <td>
    <td>      <td>      <td>      <td>      <td>      <td>{
    <td>      "text
    <td>
    <td>
    "un
    "unning
    <td>
    <td>      <td>      <td>
      <td>
      <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>      <td>
    <td>
    <td>
    <td>
    <td>
      <td>
      <td>
    {title
    <td>
      <td>
    <td>
    <td>
      <td>
    <td>
      <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
      <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    {text
      <td>
      <td>
      <td>
      <td>
      <td>
    <td>
    <td>
    <td>      <td>
    <td>
    <td>
    <td>
      <td>
    <td>
    <td>
      <td>
    {name
    {name
    {name
```{td>
    {read
    <td>
    {it
    <td>
    <td>
    "text{td>
    <td>
      <td>
      <td>
    <td>
    "text
    {text
    {text
        "text
    "text
    <td>
    {id
    "text
    <td>
    "text
    {title
    <td>
    {name
    <td>
    <td>
    "text
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    {textured
    <td>
    <td>
    {un
    <td>
    <td>
    <td>
    "un
    <td>
    <td>
    <td>
    <td>
      <td>
      <td>
    <td>
    <td>
    "text
    <td>
    <td>
      <td>
    <td>
      <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    "un
    <td>
    "text
    <td>
    <td>
    "text
    <td>
    "text{
    "text
    "text{td>
    "text
    "text
    <td>
    <td>
    <td
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
    <td>
      <td>
    <td>
    <td>
      <td>
    <td>{
    <td>
    <td>
    <td>{
    <td>      <td>      <td>      <td>      <td>
    <td>
    <td>
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