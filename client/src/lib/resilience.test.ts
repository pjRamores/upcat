import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/api";
import {
  __resilienceTestOnly,
  getResilienceState,
  installGlobalResilienceHooks,
  subscribeResilience,
} from "@/lib/resilience";

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

describe("resilience_hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    __resilienceTestOnly.resetState(true);
    vi.stubGlobal("localStorage", new MemoryStorage());
    vi.stubGlobal("sessionStorage", new MemoryStorage());
    localStorage.setItem("token", "test-token");
  });

  it("registers online/offline listeners on install", async () => {
    const listeners = new Map<string, Array<() => void>>();
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: () => void) => {
        const list = listeners.get(name) ?? [];
        list.push(fn);
        listeners.set(name, list);
      },
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { isActive: false } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

    installGlobalResilienceHooks();
    await Promise.resolve();

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(listeners.get("online")?.length).toBe(1);
    expect(listeners.get("offline")?.length).toBe(1);
  });

  it("updates subscribed state on offline and online events", async () => {
    const listeners = new Map<string, Array<() => void>>();
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: () => void) => {
        const list = listeners.get(name) ?? [];
        list.push(fn);
        listeners.set(name, list);
      },
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: null } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

    const seen: boolean[] = [];
    const unsubscribe = subscribeResilience((state) => {
      seen.push(state.online);
    });

    installGlobalResilienceHooks();
    listeners.get("offline")?.[0]?.();
    listeners.get("online")?.[0]?.();

    unsubscribe();

    expect(seen).toContain(false);
    expect(seen).toContain(true);
    expect(getResilienceState().online).toBe(true);
  });
});
const listeners = new Map<string, Array<() => void>>();
vi.stubGlobal("window", {
    addEventListener: (name: string, fn: () => void) => {
        const list = listeners.get(name) ?? [];
        list.push(fn);
        listeners.set(name, list);
    },
});
vi.mocked(apiClient.get).mockResolvedValue({data: {data: null}});
vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});

installGlobalResilienceHooks();
installGlobalResilienceHooks();

expect(listeners.get("online")?.length).toBe(1);
expect(listeners.get("offline")?.length).toBe(1);
expect(listeners.get("beforeunload")?.length).toBeUndefined();
});

it("does not register beforeunload cleanup handler", () => {
    const listeners = new Map<string, Array<() => void>>();
    vi.stubGlobal("window", {
        addEventListener: (name: string, fn: () => void) => {
            const list = listeners.get(name) ?? [];
            list.push(fn);
            listeners.set(name, list);
        },
    });
    vi.mocked(apiClient.get).mockResolvedValue({data: {data: null}});
    vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});

    installGlobalResilienceHooks();
    expect(listeners.get("beforeunload")?.length).toBeUndefined();
});

it("does not send heartbeat when initialized offline", async () => {
    resilienceTestOnly.resetState(false);
    const listeners = new Map<string, Array<() => void>>();
    vi.stubGlobal("window", {
        addEventListener: (name: string, fn: () => void) => {
            const list = listeners.get(name) ?? [];
            list.push(fn);
            listeners.set(name, list);
        },
    });
    vi.mocked(apiClient.get).mockResolvedValue({data: {data: null}});
    vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});

    installGlobalResilienceHooks();
    await Promise.resolve();

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
});

it("does not send heartbeat without auth token", async () => {
    localStorage.removeItem("token");
    const listeners = new Map<string, Array<() => void>>();
    vi.stubGlobal("window", {
        addEventListener: (name: string, fn: () => void) => {
            const list = listeners.get(name) ?? [];
            list.push(fn);
            listeners.set(name, list);
        },
    });
    vi.mocked(apiClient.get).mockResolvedValue({data: {data: null}});
    vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});

    installGlobalResilienceHooks();
    await Promise.resolve();

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
});