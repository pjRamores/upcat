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
  __resilienceTestOnly.resetState(false);
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