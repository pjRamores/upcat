import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId, type WithId, type Document } from "mongodb";
import { requireSessionAccess } from "../../src/examHelpers.js";
import type { ExamQuestion, QuestionChoice } from "@upcat/shared";

type SessionQuestionEntry = {
  questionId: ObjectId;
  orderIndex: number;
  userAnswer: string | null;
  choices?: QuestionChoice[];
};

type ExamSessionDoc = {
  _id: ObjectId;
  userId: ObjectId;
  status: string;
  startedAt?: Date | string | null;
  config?: {
    timeLimit?: number;
  };
  timerState?: {
    pausedAt?: Date | string | null;
    totalPausedMs?: number | null;
  };
  questions?: SessionQuestionEntry[];
};

type QuestionDoc = WithId<Document> & {
  setID?: string;
  setId?: string;
  setid?: string;
  subjectArea?: unknown;
  subtopic?: unknown;
  difficulty?: unknown;
  type?: unknown;
  passageId?: ObjectId | null;
  questionText?: unknown;
  choices?: QuestionChoice[];
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

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return "";
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

  const { db, userId, sessionId } = ctx;

  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
  const limit = Math.max(
    1,
    Math.min(100, parseInt((req.query.limit as string) ?? "10", 10) || 10),
  );

  const session = (await db.collection("exam_sessions").findOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(userId),
  })) as ExamSessionDoc | null;

  if (!session) {
    res.status(404).json({ success: false, error: "Session not found" });
    return;
  }

  const pausedAtRaw = session.timerState?.pausedAt;
  const pausedAt =
    pausedAtRaw instanceof Date
      ? pausedAtRaw
      : typeof pausedAtRaw === "string"
        ? new Date(pausedAtRaw)
        : null;

  const pausedAtMs =
    pausedAt && !Number.isNaN(pausedAt.getTime()) ? pausedAt.getTime() : null;

  const totalPausedMs = Math.max(0, Number(session.timerState?.totalPausedMs ?? 0));
  const activePauseMs = pausedAtMs ? Math.max(0, Date.now() - pausedAtMs) : 0;
  const timerExtensionMs = totalPausedMs + activePauseMs;

  const orderedEntries = [...(session.questions ?? [])].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const totalQuestions = orderedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalQuestions / limit));
  const slice = orderedEntries.slice((page - 1) * limit, page * limit);

  const questionIds = slice.map((q) => q.questionId);

  const docs = (await db
    .collection("questions")
    .find({ _id: { $in: questionIds } })
    .project({ correctAnswer: 0, rationale: 0 })
    .toArray()) as QuestionDoc[];

  const byId = new Map(docs.map((d) => [d._id.toString(), d]));

  const passageIds = [
    ...new Set(
      docs
        .map((d) => d.passageId)
        .filter((p): p is ObjectId => p instanceof ObjectId),
    ),
  ];

  const passages = passageIds.length
    ? ((await db
        .collection("passages")
        .find({ _id: { $in: passageIds } })
        .toArray()) as PassageDoc[])
    : [];

  const passageById = new Map(passages.map((p) => [p._id.toString(), p]));

  const questions: (ExamQuestion & {
    orderIndex: number;
    userAnswer: string | null;
    passage?: unknown;
  })[] = slice
    .map((entry) => {
      const doc = byId.get(entry.questionId.toString());
      if (!doc) return null;

      const passageId = doc.passageId ? doc.passageId.toString() : null;
      const passage = passageId ? passageById.get(passageId) : null;

      return {
        _id: doc._id.toString(),
        setId: String(doc.setID ?? doc.setId ?? doc.setid ?? "set-default"),
        subjectArea: doc.subjectArea,
        subtopic: doc.subtopic,
        difficulty: doc.difficulty,
        type: doc.type,
        passageId,
        questionText: doc.questionText,
        choices: entry.choices ?? doc.choices ?? [],
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        createdAt: toIso(doc.createdAt),
        updatedAt: toIso(doc.updatedAt),
        orderIndex: entry.orderIndex,
        userAnswer: entry.userAnswer,
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
    .filter(Boolean) as (ExamQuestion & {
    orderIndex: number;
    userAnswer: string | null;
    passage?: unknown;
  })[];

  questions.sort((a, b) => a.orderIndex - b.orderIndex);

  res.status(200).json({
    success: true,
    data: {
      questions,
      currentPage: page,
      totalPages,
      totalQuestions,
      session: {
        _id: session._id.toString(),
        status: session.status,
        timeLimit: session.config?.timeLimit ?? 0,
        subjectTimeLimits: session.config?.subjectTimeLimits ?? null,
        startedAt: toIso(session.startedAt) || null,
        timerExtensionMs,
        isPaused: Boolean(pausedAtMs),
        pausedAt: pausedAtMs ? new Date(pausedAtMs).toISOString() : null,
      },
    },
  });
}
