import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/api";
import { clearSessionQueue, flushSessionQueue } from "@/lib/syncQueue";
import { saveSnapshotNow } from "@/lib/sessionRecovery";
import { useExamStore } from "@/stores/examStore";

vi.mock("@/lib/api", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock("@/lib/syncQueue", () => ({
    enqueueAnswer: vi.fn(),
    clearSessionQueue: vi.fn(),
    flushSessionQueue: vi.fn(),
}));

vi.mock("@/lib/sessionRecovery", () => ({
    saveSnapshot: vi.fn(),
    saveSnapshotNow: vi.fn(),
    checkServerStatus: vi.fn(),
}));

describe("examStore.submit.failure.paths", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useExamStore.getState().reset();
    });

    it("sets.store.error-and-rethrows.when.submit.API.fails", async () => {
        const flushDirtyMock = vi.fn().mockResolvedValue(1);
        vi.mocked(flushSessionQueue).mockResolvedValue(1);
        vi.mocked(saveSnapshotNow).mockResolvedValue();
        vi.mocked(apiClient.post).mockRejectedValue({
            response: { data: { error: "submit.failed" } },
        });

        useExamStore.setState({
            sessionId: "sess-err",
            currentIndex: 0,
            totalQuestions: 1,
            timeLimit: 60,
            startedAt: Date.now(),
            states: [
                {
                    questionId: "q1",
                    orderIndex: 0,
                    subjectArea: "Mathematics",
                    difficulty: "medium",
                    visited: true,
                    answer: "A",
                    flagged: false,
                    timeSpent: 12,
                    dirty: false,
                },
            ],
            flushDirty: flushDirtyMock,
        });

        await expect(useExamStore.getState().submit()).rejects.toBeTruthy();
        expect(useExamStore.getState().error).toBe("submit.failed");
        expect(clearSessionQueue).not.toHaveBeenCalled();
    });

    it("stops.before.API.submit.when.flushDirty.throws", async () => {
        const flushDirtyMock = vi.fn().mockRejectedValue(new Error("flush.failed"));

        useExamStore.setState({
            sessionId: "sess-err2",
            currentIndex: 0,
            totalQuestions: 1,
            timeLimit: 60,
            startedAt: Date.now(),
            states: [
                {
                    questionId: "q1",
                    orderIndex: 0,
                    subjectArea: "Mathematics",
                    difficulty: "medium",
                    visited: true,
                    answer: "A",
                    flagged: false,
                    timeSpent: 12,
                    dirty: true,
                },
            ],
            flushDirty: flushDirtyMock,
        });

        await expect(useExamStore.getState().submit()).rejects.toBeTruthy();
        expect(apiClient.post).not.toHaveBeenCalled();
        expect(flushSessionQueue).not.toHaveBeenCalled();
        expect(saveSnapshotNow).not.toHaveBeenCalled();
        expect(clearSessionQueue).not.toHaveBeenCalled();
    });
});