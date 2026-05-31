import {beforeEach, describe, expect, it, vi} from "vitest";
import apiClient from "@/lib/api";

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

describe("offline to online resume integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  it("flushes sync queue entries when online event is dispatched", async () => {
    const listeners = new Map<string, Array<() => void>>();
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: () => void) => {
        const list = listeners.get(name) ?? [];
        list.push(fn);
        listeners.set(name, list);
      },
    });
    vi.stubGlobal("setInterval", vi.fn(() => 1));
    vi.stubGlobal("clearInterval", vi.fn());

    vi.mocked(apiClient.get).mockResolvedValue({data: {data: {isActive: false}}});
    vi.mocked(apiClient.post).mockImplementation(async (url: string) => {
      if (url === "/sync/answers") {
        return {data: {data: {answersAccepted: 1}}};
      }
      return {data: {success: true}};
    });

    const resilience = await import("@/lib/resilience");
    const syncQueue = await import("@/lib/syncQueue");

    resilience.__resilienceTestOnly.resetState(false);
    syncQueue.installSyncQueueHooks();
    resilience.installGlobalResilienceHooks();
    syncQueue.enqueueAnswer("sess-int", "q1", "A", 12);

    expect(syncQueue.getSessionQueue("sess-int")).toHaveLength(1);
    listeners.get("online").forEach((fn) => fn());
    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.post).toHaveBeenCalledWith(
      "/sync/answers",
      expect.objectContaining({sessionId: "sess-int"})
    );
    expect(syncQueue.getSessionQueue("sess-int")).toHaveLength(0);
  });
});