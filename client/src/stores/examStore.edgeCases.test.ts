import {beforeEach, describe, expect, it, vi} from "vitest";
import {apiClient} from "@/lib/api";
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
  enqueueSessionAction: vi.fn(),
  flushSessionActionQueue: vi.fn(),
}));

vi.mock("@/lib/sessionRecovery", () => ({
  saveSnapshot: vi.fn(),
  saveSnapshotNow: vi.fn(),
  checkServerStatus: vi.fn(),
}));

const baseState = {
  sessionId: "sess-edge",
  currentIndex: 0,
  states: [
    {
      questionId: "q1",
      orderIndex: 0,
      subjectArea: "Mathematics" as const,
      difficulty: "medium" as const,
      visited: true,
      answer: null as "A" | "B" | "C" | "D" | null,
      flagged: false,
      timeSpent: 0,
      dirty: false,
    },
  ],
};

describe("examStore·edge·cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", {onLine: true});
    useExamStore.getState().reset();
  });

  it("tick·does·not·increment·timeSpent·when·session·is·paused", () => {
    useExamStore.setState({...baseState, isPaused: true});

    useExamStore.getState().tick(5);

    const {states} = useExamStore.getState();
    expect(states[0]?.timeSpent).toBe(0);
  });

  it("tick·increments·timeSpent·when·session·is·not·paused", () => {
    useExamStore.setState({...baseState, isPaused: false});

    useExamStore.getState().tick(3);

    const {states} = useExamStore.getState();
    expect(states[0]?.timeSpent).toBe(3);
  });

  it("flushDirty·returns·0·immediately·when·no·states·are·dirty", async () => {
    useExamStore.setState({
      ...baseState,
      states: [{...baseState.states[0]!, dirty: false}],
    });

    const result = await useExamStore.getState().flushDirty();

    expect(result).toBe(0);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("selectAnswer·deselects·when·the·same·choice·is·clicked·again", () => {
    useExamStore.setState({
      ...baseState,
      states: [{...baseState.states[0]!, answer: "B" as const}],
    });

    useExamStore.getState().selectAnswer("B");

    const {states} = useExamStore.getState();
    expect(states[0]?.answer).toBeNull();
    expect(states[0]?.dirty).toBe(true);
  });

  it("selectAnswer·sets·a·new·choice·when·a·different·letter·is·clicked", () => {
    useExamStore.setState({
      ...baseState,
      states: [{...baseState.states[0]!, answer: "A" as const}],
    });

    useExamStore.getState().selectAnswer("C");

    const {states} = useExamStore.getState();
    expect(states[0]?.answer).toBe("C");
    expect(states[0]?.dirty).toBe(true);
... });
} );