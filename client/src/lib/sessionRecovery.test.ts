import {beforeEach, describe, expect, it, vi} from "vitest";
import {apiClient} from "@/lib/api";
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
    return this.store.has(key)? this.store.get(key)?? null::null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index]?? null;
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

  it("throttles repeated snapshot saves for practice sessions", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});
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
      "/sync/session-snapshot",
      expect.objectContaining({
        sessionId: "sess-practice",
        sessionType: "practice",
        deviceId: expect.any(String),
        snapshot,
      }),
    );
  });

  it("saveSnapshotNow bypasses throttle", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});
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

  it("returns null on status endpoint failure", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("down"));
    const status = await checkServerStatus("sess-status");

    expect(status).toBeNull();
  });

  it("returns merged answered questions when recovery succeeds", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {