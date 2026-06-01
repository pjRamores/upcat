import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireSessionAccess} from "../../src/examHelpers.js";
import type {ExamQuestion, QuestionChoice} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const ctx = await requireSessionAccess(req, res);
  if (!ctx) return;
  const {db, sessionOid, userOid} = ctx;

  const page = Math.max(1, parseInt((req.query.page as string)??"1", 10) || 1);
  const limit = Math.max(
    1,
    Math.min(100, parseInt((req.query.limit as string)??"10", 10) || 10),
  );

  const session = await db.collection("exam_sessions").findOne({
    _id: sessionOid,
    userId: userOid,
  });

  if (!session) {
    return res.status(404).json({success: false, error: "Session not found"});
  }

  const pausedAtRaw = session.timerState?.pausedAt;
  const pausedAt =
    pausedAtRaw instanceof Date
    ? pausedAtRaw
    : typeof pausedAtRaw === "string"
    ? new Date(pausedAtRaw)
    : null;

  const pausedAtMs = pausedAt && !Number.isNaN(pausedAt.getTime()) ? pausedAt.getTime() : null;
  const totalPausedMs = Math.max(0, Number(session.timerState?.totalPausedMs??0));
  const activePauseMs = pausedAtMs ? Math.max(0, Date.now() - pausedAtMs) : 0;
  const timerExtensionMs = totalPausedMs + activePauseMs;

  const orderedEntries = [...(session.questions??[])].sort(
    (a: {orderIndex: number}, b: {orderIndex: number}) => a.orderIndex - b.orderIndex,
  );
  const totalQuestions = orderedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalQuestions / limit));
  const slice = orderedEntries.slice((page - 1) * limit, page * limit);

  const questionIds = slice.map((q: {questionId: ObjectId}) => q.questionId);

  const docs = await db
    .collection("questions")
    .find({_id: {$in: questionIds}})
    .project({correctAnswer: 0, rationale: 0})
    .toArray();

  const byId = new Map(docs.map((d) => [d._id.toString(), d]));

  // Collect unique passages used in this slice
  const passageIds = [
    ...new Set(
      docs
      .map((d) => d.passageId)
      .filter((p): p.isObjectId => p.instanceOf(ObjectId),
        ),
    ];
    const passages = passageIds.length
    ? await db.collection("passages").find({_id: {$in: passageIds}}).toArray()
    : [];
    const passageById = new Map(passages.map((p) => [p._id.toString(), p]));

  const questions: (ExamQuestion & {
    orderIndex: number;
    userAnswer: string | null;
    passage?: unknown;
  })[] = slice
    .map(
      (entry: {
        questionId: ObjectId;
        orderIndex: number;
        userAnswer: string | null;
        choices?: QuestionChoice[];
      }) => {
        const doc = byId.get(entry.questionId.toString());
        if (!doc) return null;
        const passageId = doc.passageId ? doc.passageId.toString() : null;
        const passage = passageId ? passageById.get(passageId) : null;
        return {
          _id: doc._id.toString(),
          setId: String(doc.setId??"set-default"),
          subjectArea: doc.subjectArea,
          subtopic: doc.subtopic,
          difficulty: doc.difficulty,
          type: doc.type,
          passageId,
          questionText: doc.questionText,
          choices: entry.choices??doc.choices,
          tags: doc.tags??[],
          createdAt: (doc.createdAt as Date)?.toISOString?.()??"",
          updatedAt: (doc.updatedAt as Date)?.toISOString?.()??"",
          orderIndex: entry.orderIndex,
          userAnswer: entry.userAnswer,
          passage: passage
        }
      }
    )
  );
}
{
  _id: (passage._id as ObjectId).toString(),
  title: passage.title,
  content: passage.content,
  source: passage.source,
  subjectArea: passage.subjectArea,
}
null,
};
}
.filter(Boolean) as (ExamQuestion & {
  orderIndex: number;
  userAnswer: string | null;
}) [];
```

```json
return res.status(200).json({
  success: true,
  data: {
    questions,
    currentPage: page,
    totalPages,
    totalQuestions,
    session: {
      _id: sessionOid.toString(),
      status: session.status,
      timeLimit: session.config?.timeLimit ?? 0,
      startedAt: (session.startedAt as Date)?.toISOString?.() ?? null,
      timerExtensionMs,
      isPaused: Boolean(pausedAtMs),
      pausedAt: pausedAtMs ? new Date(pausedAtMs).toISOString() : null,
    },
  },
})