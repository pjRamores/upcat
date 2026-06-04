interface PersistedPracticeRuntime {
    idx: number;
}

export function getPracticeRuntimeKey(sessionId: string): string {
    return `upcat.practice.runtime.${sessionId}`;
}

export function clampPracticeIndex(idx: number, totalCards: number): number {
    if (totalCards <= 0) return 0;
    return Math.min(Math.max(idx, 0), totalCards - 1);
}

export function createPracticeSnapshot(idx: number, totalCards: number) {
    return {
        currentIndex: clampPracticeIndex(idx, totalCards),
        totalQuestions: totalCards,
        timeLimit: 0,
        startedAt: null,
        answeredQuestions: [],
    };
}

export function loadPersistedPracticeRuntime(
    sessionId: string
): PersistedPracticeRuntime | null {
    try {
        const raw = sessionStorage.getItem(getPracticeRuntimeKey(sessionId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersistedPracticeRuntime;
        if (!parsed || typeof parsed.idx !== "number") return null;
        return parsed;
    } catch {
        return null;
    }
}

export function persistPracticeRuntime(sessionId: string, idx: number): void {
    try {
        sessionStorage.setItem(
            getPracticeRuntimeKey(sessionId),
            JSON.stringify({ idx })
        );
    } catch {
        // best effort only
    }
}

export function clearPersistedPracticeRuntime(sessionId: string): void {
    try {
        sessionStorage.removeItem(getPracticeRuntimeKey(sessionId));
    } catch {
        // best effort only
    }
}