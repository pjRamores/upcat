import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/api";
import {
  clearSessionQueue,
  enqueueAnswer,
  enqueueSessionAction,
  flushAllQueues,
  flushSessionActionQueue,
  flushSessionQueue,
  getSessionQueue,
  installSyncQueueHooks,
  pendingSessionCount,
} from "@/lib/syncQueue";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
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
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("syncQueue", () => {
  beforeEach(() => {
    const ls = new MemoryStorage();
    vi.stubGlobal("localStorage", ls);
    vi.clearAllMocks();
  });

  it("deduplicates by sessionId+questionId", () => {
    enqueueAnswer("s1", "q1", "A", 10);
    enqueueAnswer("s1", "q1", "C", 20);

    const queued = getSessionQueue("s1");
    expect(queued).toHaveLength(1);
    expect(queued[0]?.answer).toBe("C");
    expect(queued[0]?.timeSpent).toBe(20);
  });

  it("flushes queued answers and clears session queue on success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { answersAccepted: 2 } } });

    enqueueAnswer("s1", "q1", "A", 10);
    enqueueAnswer("s1", "q2", "B", 20);

    const accepted = await flushSessionQueue("s1", { deviceId: "device-1" });

    expect(accepted).toBe(2);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/sync/answers",
      expect.objectContaining({
        sessionId: "s1",
        deviceId: "device-1",
        answers: expect.arrayContaining([
          expect.objectContaining({
            questionId: "q1",
            answer: "A",
            timeSpent: 10,
            answeredAt: expect.any(String),
          }),
          expect.objectContaining({
            questionId: "q2",
            answer: "B",
            timeSpent: 20,
            answeredAt: expect.any(String),
          }),
        ]),
      }),
    );
    expect(getSessionQueue("s1")).toHaveLength(0);
  });

  it("increments retries on failure and eventually drops entries", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("network"));
    enqueueAnswer("s1", "q1", "D", 33);

    for (let i = 0; i < 6; i++) {
const accepted = await flushSessionQueue("s1");
expect(accepted).toBe(0);

it("tracks pending sessions and supports session clear", () => {
    enqueueAnswer("s1", "q1", "A", 1);
    enqueueAnswer("s2", "q2", "B", 2);

    expect(pendingSessionCount()).toBe(2);
    clearSessionQueue("s1");
    expect(pendingSessionCount()).toBe(1);
});

it("auto-flushes when online event fires", async () => {
    const listeners = new Map<string, (() => void)[]>();
    vi.stubGlobal("window", {
        addEventListener: (name: string, fn: () => void) => {
            const arr = listeners.get(name) ?? [];
            arr.push(fn);
            listeners.set(name, arr);
        },
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { answersAccepted: 1 } });

    enqueueAnswer("s1", "q1", "A", 5);
    installSyncQueueHooks();

    const onlineHandlers = listeners.get("online") ?? [];
    expect(onlineHandlers.length).toBe(1);
    onlineHandlers[0]?.();
    await Promise.resolve();

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(getSessionQueue("s1")).toHaveLength(0);
});

it("ignores concurrent duplicate flushAllQueues calls while a flush is in progress", async () => {
    let resolvePost!: (value: { data: { answersAccepted: number } }) => void;
    const inFlight = new Promise<{ data: { answersAccepted: number } }>((resolve) => {
        resolvePost = resolve;
    });
    vi.mocked(apiClient.post).mockImplementation(
        () => inFlight as Promise<{ data: { answersAccepted: number } }>
    );

    enqueueAnswer("s1", "q1", "A", 5);
    void flushAllQueues();
    void flushAllQueues();

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    resolvePost({ data: { answersAccepted: 1 } });
    await Promise.resolve();
});

it("schedules exponential backoff retry delays when flushes fail", async () => {
    const setTimeoutMock = vi.fn(() => 123 as unknown as ReturnType<typeof setTimeout>);
    const clearTimeoutMock = vi.fn();
    vi.stubGlobal("setTimeout", setTimeoutMock);
    vi.stubGlobal("clearTimeout", clearTimeoutMock);
    vi.mocked(apiClient.post).mockRejectedValue(new Error("network"));

    enqueueAnswer("s1", "q1", "A", 5);

    await flushAllQueues();
    expect(setTimeoutMock).toHaveBeenCalledTimes(2);
    expect(setTimeoutMock).toHaveBeenNthCalledWith(1, expect.any(Function), 4_000);
    expect(setTimeoutMock).toHaveBeenNthCalledWith(2, expect.any(Function), 8_000);

    await flushAllQueues();
    expect(setTimeoutMock).toHaveBeenCalledTimes(3);
    expect(setTimeoutMock).toHaveBeenNthCalledWith(3, expect.any(Function), 16_000);
});

describe("syncQueue -- session action queue", () => {
    beforeEach(() => {
        const ls = new MemoryStorage();
        vi.stubGlobal("localStorage", ls);
        vi.clearAllMocks();
    });

    it("enqueueSessionAction appends distinct actions in order", () => {
        enqueueSessionAction("s1", "pause", "2024-01-01T00:00:00.000Z");
        enqueueSessionAction("s1", "resume", "2024-01-01T00:05:00.000Z");

        // Flushing should call the server twice (one per action)
        vi.mocked(apiClient.post).mockResolvedValue({});

        // Verify both ended up in localStorage by flushing and checking call count
        return flushSessionActionQueue("s1").then((sent) => {
            expect(sent).toBe(2);
            expect(apiClient.post).toHaveBeenCalledTimes(2);
            const firstCall = vi.mocked(apiClient.post).mock.calls[0];
            const secondCall = vi.mocked(apiClient.post).mock.calls[1];
            expect(firstCall[0]).toContain("/pause");
            expect(secondCall[0]).toContain("/resume");
        });
    });

    it("enqueueSessionAction deduplicates consecutive identical actions", () => {
        enqueueSessionAction("s1", "pause", "2024-01-01T00:00:00.000Z");
        enqueueSessionAction("s1", "pause", "2024-01-01T00:01:00.000Z");

        vi.mocked(apiClient.post).mockResolvedValue({});
    });
});
it("Only one pause action should remain (last-write-wins)", () => {
    return flushSessionActionQueue("s1").then((sent) => {
        expect(sent).toBe(1);
        expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
});

it("clearSessionQueue removes both answer and session action entries", () => {
    enqueueAnswer("s1", "q1", "A", 5);
    enqueueSessionAction("s1", "pause");
    enqueueAnswer("s2", "q2", "B", 10);
    enqueueSessionAction("s2", "resume");

    expect(pendingSessionCount()).toBe(2);

    clearSessionQueue("s1");

    expect(pendingSessionCount()).toBe(1);
    expect(getSessionQueue("s1")).toHaveLength(0);
});

it("flushSessionActionQueue increments retries on failure and stops at first error", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("server error"));
    enqueueSessionAction("s1", "pause", "2024-01-01T00:00:00.000Z");
    enqueueSessionAction("s1", "resume", "2024-01-01T00:05:00.000Z");

    const sent = await flushSessionActionQueue("s1");
    expect(sent).toBe(0);

    // Only the first action should have been attempted (stops at first failure)
    expect(apiClient.post).toHaveBeenCalledTimes(1);
});

it("flushSessionActionQueue drops action after MAX_RETRIES exceeded", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("network"));
    enqueueSessionAction("s1", "pause");

    // 6 flush attempts > MAX_RETRIES (5)
    for (let i = 0; i < 6; i++) {
        await flushSessionActionQueue("s1");
    }

    // After exceeding max retries the entry should be dropped
    vi.mocked(apiClient.post).mockResolvedValue({});
    const sent = await flushSessionActionQueue("s1");
    expect(sent).toBe(0);
});