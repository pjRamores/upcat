import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireSessionAccess} from "../../src/examHelpers.js";
import {type QuestionChoice, SUBJECT_AREAS, type SubjectArea} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const ctx = await requireSessionAccess(req, res);
  if (!ctx) return;
  const {db, sessionOid, userOid} = ctx;

  const subjectFilter = req.query.subjectArea as string | undefined;
  if (subjectFilter && !SUBJECT_AREAS.includes(subjectFilter as SubjectArea)) {
    return res.status(400).json({success: false, error: "Invalid subjectArea"});
  }

  const session = await db.collection("exam_sessions").findOne({
    _id: sessionOid,
    userId: userOid,
  });
  if (!session) {
    return res.status(404).json({success: false, error: "Session not found"});
  }
  if (session.status !== "completed") {
    return res.status(400).json({success: false, error: "Session is not completed"});
  }

  const entries = (session.questions ?? []) as {
    questionId: ObjectId;
    orderIndex: number;
    userAnswer: string | null;
    isCorrect: boolean | null;
    flagged?: boolean;
    timeSpent: number | null;
    choices?: QuestionChoice[];
    correctAnswer?: "A" | "B" | "C" | "D";
  }[];

  const questionIds = entries.map((e) => e.questionId);

  const questionDocs = await db.collection("questions")
    .find({_id: {$in: questionIds}})
    .toArray();

  const passageIds = [
    ...new Set(
      questionDocs
        .map((d) => d.passageId)
        .filter((p): p.isObjectId => p.instanceof ObjectId),
    ),
  ];
  const passageDocs = passageIds.length
    ? await db.collection("passages").find({_id: {$in: passageIds}}).toArray()
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
        choices: entry.choices ?? doc.choices,
        correctAnswer: entry.correctAnswer ?? doc.correctAnswer,
        rationale: doc.rationale,
        tags: doc.tags ?? [],
        createdAt: (doc.createdAt as Date).toISOString().() ?? "",
        updatedAt: (doc.updatedAt as Date).toISOString().() ?? "",
        orderIndex: entry.orderIndex,
        userAnswer: entry.userAnswer,
        isCorrect: entry.isCorrect ?? false,
        isFlagged: Boolean(entry.flagged),
        isReported: false,
        timeSpent: entry.timeSpent,
        passage: passage
      }?
      _id: (passage._id as ObjectId).toString(),
      title: passage.title,
      content: passage.content,
      source: passage.source,
      subjectArea: passage.subjectArea,
    }
  );
  filter(Boolean);
}
return res.status(200).json({
  success: true,
  data: {
    session: {
      _id: sessionOid.toString(),
      status: session.status,
      config: session.config,
      score: session.score,
      startedAt: (session.startedAt as Date).toISOString().??null,
      completedAt: (session.completedAt as Date).toISOString().??null,
      totalQuestions: entries.length,
    },
    questions,
  },
})