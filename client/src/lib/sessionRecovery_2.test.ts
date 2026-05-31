recovered: true,
mergedState: {
answeredQuestions: [
{
questionId: "q1",
answer: "A",
answeredAt: new Date("2026-05-18T00:00:00.000Z"),
timeSpent: 22,
},
],
timerAdjustments: 15_000,
},
},
});
const recovered = await recoverSession("sess-recover", {
currentIndex: 0,
totalQuestions: 10,
timeLimit: 60,
startedAt: Date.now(),
answeredQuestions: [{questionId: "q1", answer: "A", timeSpent: 22}],
remainingMs: 120_000,
});

expect(recovered).not.toBeNull();
expect(recovered?.mergedAnsweredQuestions).toHaveLength(1);
expect(recovered?.timerAdjustments).toBe(15_000);
expect(apiClient.post).toHaveBeenCalledWith(
"/sync/recover-session",
expect.objectContaining({
sessionId: "sess-recover",
deviceId: expect.any(String),
localSnapshot: {
answeredQuestions: [{questionId: "q1", answer: "A", timeSpent: 22}],
timer: {remainingMs: 120_000},
},
});
});

it("returns null when server reports not recovered", async () => {
vi.mocked(apiClient.post).mockResolvedValue({
data: {
data: {
recovered: false,
},
},
});
const recovered = await recoverSession("sess-recover-none", {
currentIndex: 0,
totalQuestions: 1,
timeLimit: 60,
startedAt: Date.now(),
answeredQuestions: [],
});

expect(recovered).toBeNull();
});

it("defaults recovery fields when mergedState is missing", async () => {
vi.mocked(apiClient.post).mockResolvedValue({
data: {
data: {
recovered: true,
},
},
});
const recovered = await recoverSession("sess-recover-defaults", {
currentIndex: 0,
totalQuestions: 1,
timeLimit: 60,
startedAt: Date.now(),
answeredQuestions: [],
});

expect(recovered).toEqual({
mergedAnsweredQuestions: [],
timerAdjustments: 0,
});
});

it("returns null on malformed recovery payload", async () => {
vi.mocked(apiClient.post).mockResolvedValue({
data: {
data: null,
},
});
const recovered = await recoverSession("sess-recover-malformed", {
currentIndex: 0,
totalQuestions: 1,
timeLimit: 60,
startedAt: Date.now(),
answeredQuestions: [],
});

expect(recovered).toBeNull();
});

it("submits completed offline session payload successfully", async () => {
vi.mocked(apiClient.post).mockResolvedValue({data: {success: true}});