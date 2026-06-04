import { describe, expect, it } from "vitest";
import { computeRemainingSeconds } from "@/pages/ExamPage";

describe("ExamPage.timer.behavior.helper", () => {
    it("returns-base-remaining-time-without-extension", () => {
        expect(computeRemainingSeconds(60, 0, 30)).toBe(3570);
    });

    it("adds-timer-extension-seconds-to-remaining-time", () => {
        expect(computeRemainingSeconds(60, 45_000, 30)).toBe(3615);
    });

    it("rounds-timer-extension-milliseconds-to-nearest-second", () => {
        expect(computeRemainingSeconds(1, 1_500, 0)).toBe(62);
    });

    it("never-returns-a-negative-remaining-time", () => {
        expect(computeRemainingSeconds(1, 0, 120)).toBe(0);
    });
});