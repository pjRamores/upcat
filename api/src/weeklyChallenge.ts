/**
 * Helper for incrementally bumping a user's active weekly-challenge progress.
 *
 * Called from any "earns_progress" entry point (exam/submit, practice/complete).
 * Translates a generic event into the relevant metric, increments the user's
 * progress counter, and flips the challenge to completed when target is met.
 * Returns null when the user has no active challenge.
 */
import { type Db, type ObjectId } from "mongodb";
import type { WeeklyChallengeDef, WeeklyChallengeMetric } from "@upcat/shared";

export interface WeeklyEvent {
    examsCompleted?: number;
    questionsCorrect?: number;
    studyMinutes?: number;
    practiceSessions?: number;
    perfectScores?: number;
    /** The percentage score for an exam (used by score_above_threshold). */
    scoreAchieved?: number;
}

export interface WeeklyChallengeProgressResult {
    challengeId: string;
    progress: number;
    target: number;
    completed: boolean;
}

function deltaFor(
    metric: WeeklyChallengeMetric,
    threshold: number | null | undefined,
    ev: WeeklyEvent,
): number {
    switch (metric) {
        case "exams_completed":
            return ev.examsCompleted ?? 0;
        case "questions_correct":
            return ev.questionsCorrect ?? 0;
        case "study_minutes":
            return ev.studyMinutes ?? 0;
        case "practice_sessions":
            return ev.practiceSessions ?? 0;
        case "perfect_scores":
            return ev.perfectScores ?? 0;
        case "score_above_threshold":
            if (typeof ev.scoreAchieved === "number" && typeof threshold === "number") {
                return ev.scoreAchieved >= threshold ? 1 : 0;
            }
            return 0;
    }
}

export async function updateWeeklyChallengeProgress(
    db: Db,
    userId: ObjectId,
    event: WeeklyEvent,
): Promise<WeeklyChallengeProgressResult | null> {
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { gamification: 1 } });
    const wc = user?.gamification?.weeklyChallenge;
    if (!wc?.challengeId) return null;
    if (wc.completed) return { challengeId: wc.challengeId, progress: wc.progress, target: wc.target, completed: true };
    if (new Date(wc.expiresAt).getTime() < Date.now()) return null;

    const def = (await db.collection("weekly_challenges_catalog").findOne({ id: wc.challengeId })) as unknown as WeeklyChallengeDef | null;
    if (!def) return null;

    const delta = deltaFor(def.metric, def.threshold ?? null, event);
    if (delta <= 0) {
        return { challengeId: wc.challengeId, progress: wc.progress, target: wc.target, completed: false };
    }

    const newProgress = Math.min(wc.target, wc.progress + delta);
    const completedNow = newProgress >= wc.target && !wc.completed;
    const patch: Record<string, unknown> = {
        "gamification.weeklyChallenge.progress": newProgress,
    };
    if (completedNow) {
        patch["gamification.weeklyChallenge.completed"] = true;
        patch["gamification.weeklyChallenge.completedAt"] = new Date().toISOString();
    }
    await db.collection("users").updateOne({ _id: userId }, {$set: patch});

    return {
        challengeId: wc.challengeId,
        progress: newProgress,
        target: wc.target,
        completed: newProgress >= wc.target,
    };
}