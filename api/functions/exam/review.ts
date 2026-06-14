import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId, type WithId, type Document } from "mongodb";
import { requireSessionAccess } from "../../src/examHelpers.js";
import {
  type QuestionChoice,
  SUBJECT_AREAS,
  type SubjectArea,
} from "@upcat/shared";

type ReviewEntry = {
  questionId: ObjectId;
  orderIndex: number;
  userAnswer: string | null;
  isCorrect: boolean | null;
  flagged?: boolean;
  timeSpent: number | null;
  choices?: QuestionChoice[];
  correctAnswer?: "A" | "B" | "C" | "D";
};

type ExamSessionDoc = {
  _id: ObjectId;
  userId: ObjectId;
  status: string;
  config?: unknown;
  score?: unknown;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  questions?: ReviewEntry[];
};

type QuestionDoc = WithId<Document> & {
  subjectArea?: unknown;
  subtopic?: unknown;
  difficulty?: unknown;
  type?: unknown;
  passageId?: ObjectId | null;
  questionText?: unknown;
  choices?: QuestionChoice[];
  correctAnswer?: unknown;
  rationale?: unknown;
  tags?: unknown[];
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type PassageDoc = WithId<Document> & {
  title?: unknown;
  content?: unknown;
  source?: unknown;
  subjectArea?: unknown;
};

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const ctx = await requireSessionAccess(req, res);
  if (!ctx) return;

  const { db, sessionOid, userOid } = ctx;

  const subjectFilter = req.query.subjectArea as string | undefined;
  if (subjectFilter && !SUBJECT_AREAS.includes(subjectFilter as SubjectArea)) {
    res.status(400).json({ success: false, error: "Invalid subjectArea" });
    return;
  }

  const session = (await db.collection("exam_sessions").findOne({
    _id: sessionOid,
    userId: userOid,
  })) as ExamSessionDoc | null;

  if (!session) {
    res.status(404).json({ success: false, error: "Session not found" });
    return;
  }

  if (session.status !== "completed") {
    res.status(400).json({ success: false, error: "Session is not completed" });
    return;
  }

  const entries = (session.questions ?? []) as ReviewEntry[];
  const questionIds = entries.map((e) => e.questionId);

  const questionDocs = (await db
    .collection("questions")
    .find({ _id: { $in: questionIds } })
    .toArray()) as QuestionDoc[];

  const passageIds = [
    ...new Set(
      questionDocs
        .map((d) => d.passageId)
        .filter((p): p is ObjectId => p instanceof ObjectId),
    ),
  ];

  const passageDocs = passageIds.length
    ? ((await db
        .collection("passages")
        .find({ _id: { $in: passageIds } })
        .toArray()) as PassageDoc[])
    : [];

  const passageById = new Map(passageDocs.map((p) => [p._id.toString(), p]));
  const byId = new Map(questionDocs.map((q) => [q._id.toString(), q]));

  const sorted = [...entries].sort((a, b) => a.orderIndex - b.orderIndex);

  const questions = sorted
    .map((entry) => {
      const doc = byId.get(entry.questionId.toString());
      if (!doc) return null;
      if (subjectFilter && doc.subjectArea !== subjectFilter) return null;

      const passageId = doc.passageId ? doc.passageId.toString() : null;
      const passage = passageId ? passageById.get(passageId) : null;

      return {
        _id: doc._id.toString(),
        subjectArea: doc.subjectArea,
        subtopic: doc.subtopic,
        difficulty: doc.difficulty,
        type: doc.type,
        passageId,
        questionText: doc.questionText,
        choices: entry.choices ?? doc.choices ?? [],
        correctAnswer: entry.correctAnswer ?? doc.correctAnswer,
        rationale: doc.rationale,
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        createdAt: toIso(doc.createdAt) ?? "",
        updatedAt: toIso(doc.updatedAt) ?? "",
        orderIndex: entry.orderIndex,
        userAnswer: entry.userAnswer,
        isCorrect: entry.isCorrect ?? false,
        isFlagged: Boolean(entry.flagged),
        isReported: false,
        timeSpent: entry.timeSpent,
        passage: passage
          ? {
              _id: passage._id.toString(),
              title: passage.title,
              content: passage.content,
              source: passage.source,
              subjectArea: passage.subjectArea,
            }
          : null,
      };
    })
    .filter(isNonNull);

  res.status(200).json({
    success: true,
    data: {
      session: {
        _id: sessionOid.toString(),
        status: session.status,
        config: session.config,
        score: session.score,
        startedAt: toIso(session.startedAt),
        completedAt: toIso(session.completedAt),
        totalQuestions: entries.length,
      },
      questions,
    },
  });
}
