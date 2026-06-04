import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/api";
import {
  checkServerStatus,
  recoverSession,
  saveSnapshot,
  saveSnapshotNow,
  submitOfflineSession,
} from "@/lib/sessionRecovery";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
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

describe("sessionRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  it("throttles-repeated-snapshot-saves-for-practice-sessions", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    const snapshot = {
      currentIndex: 0,
      totalQuestions: 10,
      timeLimit: 0,
      startedAt: null,
      answeredQuestions: [],
    };

    await saveSnapshot("sess-practice", snapshot, "practice");
    await saveSnapshot("sess-practice", snapshot, "practice");

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      "sync/session-snapshot",
      expect.objectContaining({
        sessionId: "sess-practice",
        sessionType: "practice",
        deviceId: expect.any(String),
        snapshot,
      })
    );
  });

  it("saveSnapshotNow bypasses-throttle", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    const snapshot = {
      currentIndex: 1,
      totalQuestions: 10,
      timeLimit: 0,
      startedAt: null,
      answeredQuestions: [],
    };

    await saveSnapshot("sess-now", snapshot, "practice");
    await saveSnapshotNow("sess-now", snapshot, "practice");

    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it("returns-null-on-status-endpoint-failure", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("down"));

    const status = await checkServerStatus("sess-status");
    expect(status).toBeNull();
  });

  it("returns-merged-answered-questions-when-recovery-succeeds", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {

mergedState: {
    answeredQuestions: [
        {
            questionId: "q1",
            answer: "A",
            answeredAt: new Date("2026-05-18T00:00:00.000Z"),
            timeSpent: 22,
        },
    ],
    timerAdjustments: 15_000,
},
});

const recovered = await recoverSession("sess-recover", {
    currentIndex: 0,
    totalQuestions: 10,
    timeLimit: 60,
    startedAt: Date.now(),
    answeredQuestions: [{questionId: "q1", answer: "A", timeSpent: 22}],
    remainingMs: 120_000,
});

expect(recovered).not.toBeNull();
expect(recovered?.mergedAnsweredQuestions).toHaveLength(1);
expect(recovered?.timerAdjustments).toBe(15_000);
expect(apiClient.post).toHaveBeenCalledWith(
    "/sync/recover-session",
    expect.objectContaining({
        sessionId: "sess-recover",
        deviceId: expect.any(String),
        localSnapshot: {
            answeredQuestions: [{questionId: "q1", answer: "A", timeSpent: 22}],
            timer: {remainingMs: 120_000},
        },
    }),
);

it("returns null when server reports not recovered", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
        data: {
            data: {
                recovered: false,
            },
        },
    });

    const recovered = await recoverSession("sess-recover-none", {
        currentIndex: 0,
        totalQuestions: 1,
        timeLimit: 60,
        startedAt: Date.now(),
        answeredQuestions: [],
    });

    expect(recovered).toBeNull();
});

it("defaults recovery fields when mergedState is missing", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
        data: {
            data: {
                recovered: true,
            },
        },
    });

    const recovered = await recoverSession("sess-recover-defaults", {
        currentIndex: 0,
        totalQuestions: 1,
        timeLimit: 60,
        startedAt: Date.now(),
        answeredQuestions: [],
    });

    expect(recovered).toEqual({
        mergedAnsweredQuestions: [],
        timerAdjustments: 0,
    });
});

it("returns null on malformed recovery payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
        data: {
            data: null,
        },
    });

    const recovered = await recoverSession("sess-recover-malformed", {
        currentIndex: 0,
        totalQuestions: 1,
        timeLimit: 60,
        startedAt: Date.now(),
        answeredQuestions: [],
    });

    expect(recovered).toBeNull();
});

it("submits completed offline session payload successfully", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});
});
const ok = await submitOfflineSession(
    "sess-offline",
    [{questionId: "q1", answer: "B", timeSpent: 18}],
    "2026-05-18T12:00:00.000Z",
    90_000,
);

expect(ok).toBe(true);
expect(apiClient.post).toHaveBeenCalledWith("/sync/complete-offline-session", {
    sessionId: "sess-offline",
    allAnswers: [{questionId: "q1", answer: "B", timeSpent: 18}],
    completedAt: "2026-05-18T12:00:00.000Z",
    offlineData: {totalOfflineMs: 90_000},
});

it("returns false when offline session submit fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("submit failed"));

    const ok = await submitOfflineSession(
        "sess-offline-fail",
        [],
        "2026-05-18T12:00:00.000Z",
        0,
    );

    expect(ok).toBe(false);
});