const ok = await submitOfflineSession(
  "sess-offline",
  [{questionId: "q1", answer: "B", timeSpent: 18}],
  "2026-05-18T12:00:00.000Z",
  90_000,
);

expect(ok).toBe(true);
expect(apiClient.post).toHaveBeenCalledWith("/sync/complete-offline-session", {
  sessionId: "sess-offline",
  allAnswers: [{questionId: "q1", answer: "B", timeSpent: 18}],
  completedAt: "2026-05-18T12:00:00.000Z",
  offlineData: {totalOfflineMs: 90_000},
});

it("returns false when offline session submit fails", async () => {
  vi.mocked(apiClient.post).mockRejectedValue(new Error("submit failed"));
});

const ok = await submitOfflineSession(
  "sess-offline-fail",
  [],
  "2026-05-18T12:00:00.000Z",
  0,
);

expect(ok).toBe(false);
});