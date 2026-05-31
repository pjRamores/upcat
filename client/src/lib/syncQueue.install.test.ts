import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("syncQueue·hook·installation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("registers·the·online·listener·only·once", async () => {
    const addEventListener = vi.fn();
    vi.stubGlobal("window", {addEventListener});

    const mod = await import("@/lib/syncQueue");
    mod.installSyncQueueHooks();
    mod.installSyncQueueHooks();

    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
  });
});