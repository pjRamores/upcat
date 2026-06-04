import { beforeEach, describe, expect, it } from "vitest";
import { __clientErrorTrackingTestOnly } from "./clientErrorTracking";

describe("clientErrorTracking.dedupe/rate-limit", () => {
  beforeEach(() => {
    __clientErrorTrackingTestOnly.resetState();
  });

  it("dedupes repeated errors within the dedupe window", () => {
    const ts = 1_000_000;
    const key = __clientErrorTrackingTestOnly.keyFor("boom", "stack-a");

    const first = __clientErrorTrackingTestOnly.isDuplicateWithinWindow(key, ts);
    const second = __clientErrorTrackingTestOnly.isDuplicateWithinWindow(key, ts + 1000);

    expect(first).toBe(false);
    expect(second).toBe(true);
  });

  it("allows same error again after dedupe window", () => {
    const ts = 2_000_000;
    const key = __clientErrorTrackingTestOnly.keyFor("boom", "stack-a");

    __clientErrorTrackingTestOnly.isDuplicateWithinWindow(key, ts);
    const afterWindow = __clientErrorTrackingTestOnly.isDuplicateWithinWindow(
      key,
      ts + __clientErrorTrackingTestOnly.constants.DEDUPE_WINDOW_MS + 1
    );

    expect(afterWindow).toBe(false);
  });

  it("enforces per-session report cap", () => {
    __clientErrorTrackingTestOnly.setSentCount(
      __clientErrorTrackingTestOnly.constants.MAX_REPORTS_PER_SESSION
    );

    expect(__clientErrorTrackingTestOnly.isRateLimited()).toBe(true);
  });

  it("ignores known noisy ResizeObserver messages", () => {
    expect(
      __clientErrorTrackingTestOnly.shouldIgnoreMessage(
        "ResizeObserver loop limit exceeded"
      )
    ).toBe(true);
  });
});