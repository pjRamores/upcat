import { describe, expect, it } from "vitest";
import { derivePendingSyncCount, formatOfflineBannerText } from "@/pages/ExamPage";

describe("ExamPage offline behavior helpers", () => {
  it("returns null banner when online", () => {
    expect(formatOfflineBannerText(true, 3)).toBeNull();
  });

  it("formats banner without pending count when zero", () => {
    expect(formatOfflineBannerText(false, 0)).toBe(
      "You are offline -- answers are saved locally"
    );
  });

  it("formats banner with pending count when greater than zero", () => {
    expect(formatOfflineBannerText(false, 4)).toBe(
      "You are offline -- answers are saved locally (4 pending)"
    );
  });

  it("tracks pending count from dirty answers while offline", () => {
    expect(derivePendingSyncCount(false, 7, 2)).toBe(7);
  });

  it("keeps existing pending count while online", () => {
    expect(derivePendingSyncCount(true, 7, 2)).toBe(2);
  });
});