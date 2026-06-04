import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampPracticeIndex,
  clearPersistedPracticeRuntime,
  createPracticeSnapshot,
  getPracticeRuntimeKey,
  loadPersistedPracticeRuntime,
  persistPracticeRuntime,
} from "@/pages/practiceSessionRecovery";

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

describe("PracticeSessionPage recovery helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", new MemoryStorage());
  });

  it("builds a stable runtime key per session", () => {
    expect(getPracticeRuntimeKey("sess-1")).toBe("upcat.practice.runtime.sess-1");
  });

  it("clamps practice index into bounds", () => {
    expect(clampPracticeIndex(-1, 4)).toBe(0);
    expect(clampPracticeIndex(2, 4)).toBe(2);
    expect(clampPracticeIndex(10, 4)).toBe(3);
  });

  it("falls back to zero for empty card sets", () => {
    expect(clampPracticeIndex(5, 0)).toBe(0);
  });

  it("creates snapshots using the clamped current index", () => {
    expect(createPracticeSnapshot(5, 3)).toEqual({
      currentIndex: 2,
      totalQuestions: 3,
      timeLimit: 0,
      startedAt: null,
      answeredQuestions: [],
    });
  });

  it("persists and reloads practice runtime index", () => {
    persistPracticeRuntime("sess-2", 7);
    expect(loadPersistedPracticeRuntime("sess-2")).toEqual({ idx: 7 });
  });

  it("clears persisted practice runtime", () => {
    persistPracticeRuntime("sess-3", 4);
    clearPersistedPracticeRuntime("sess-3");
    expect(loadPersistedPracticeRuntime("sess-3")).toBeNull();
  });

  it("returns null for malformed persisted runtime", () => {
    sessionStorage.setItem(getPracticeRuntimeKey("sess-bad"), "{not-json}");
    expect(loadPersistedPracticeRuntime("sess-bad")).toBeNull();
  });

  it("last write wins for repeated persistence in same session", () => {
    persistPracticeRuntime("sess-4", 1);
    persistPracticeRuntime("sess-4", 3);
    expect(loadPersistedPracticeRuntime("sess-4")).toEqual({ idx: 3 });
  });

  it("keeps separate progress per session key", () => {
    persistPracticeRuntime("sess-a", 2);
    persistPracticeRuntime("sess-b", 5);

    expect(loadPersistedPracticeRuntime("sess-a")).toEqual({ idx: 2 });
    expect(loadPersistedPracticeRuntime("sess-b")).toEqual({ idx: 5 });
  });
});