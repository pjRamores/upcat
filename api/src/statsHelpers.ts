import type {Db} from "mongodb";
import {ObjectId} from "mongodb";
import type {Difficulty, SubjectArea} from "@upcat/shared";

export interface CompletedSession {
    id: ObjectId;
    userId: ObjectId;
    status: "completed";
    config: { totalQuestions: number; timeLimit: number };
    questions: {
        questionId: ObjectId;
        userAnswer: string | null;
        isCorrect: boolean | null;
        timeSpent: number | null;
    }[];
    score: {
        total: number;
        correct: number;
        incorrect: number;
        unanswered: number;
        percentage: number;
        bySubject: Record<SubjectArea, { correct: number; total: number; percentage: number }>;
    };
    startedAt: Date;
    completedAt: Date;
    createdAt: Date;
}

/**
 * Load all completed sessions for the user, newest first.
 */
export async function loadCompletedSessions(
    db: Db,
    userId: ObjectId,
): Promise<CompletedSession[]> {
    return db
        .collection("exam_sessions")
        .find({userId, status: "completed"})
        .sort({completedAt: -1})
        .toArray() as unknown as CompletedSession[];
}

/**
 * Per-question metadata lookup map for sessions.
 */
export async function loadQuestionMeta(
    db: Db,
    questionIds: ObjectId[],
): Promise<Map<string, { subjectArea: SubjectArea; difficulty: Difficulty; subtopic: string }>> {
    if (questionIds.length === 0) return new Map();
    const docs = await db
        .collection("questions")
        .find({$in: questionIds})
        .project({subjectArea: 1, difficulty: 1, subtopic: 1})
        .toArray();
    return new Map(
        docs.map((d) => [
            d._id.toString(),
            {
                subjectArea: d.subjectArea as SubjectArea,
                difficulty: d.difficulty as Difficulty,
                subtopic: d.subtopic as string,
            },
        ]),
    );
}