import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId, type AnyBulkWriteOperation } from "mongodb";
import { requireSessionAccess } from "../../src/examHelpers.js";

interface BulkAnswer {
  questionId: string;
  answer: "A" | "B" | "C" | "D" | null;
  timeSpent?: number;
}

interface BulkBody {
  answers?: BulkAnswer[];
}

function isValidAnswer(value: unknown): value is BulkAnswer["answer"] {
  return (
    value === null ||
    value === "A" ||
    value === "B" ||
    value === "C" ||
    value === "D"
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  const ctx = await requireSessionAccess(req, res);
  if (!ctx) return;

  const { db, sessionId, userId } = ctx;

  const { answers } = (req.body ?? {}) as BulkBody;
  if (!Array.isArray(answers)) {
    res.status(400).json({
      success: false,
      error: "answers array required",
    });
    return;
  }

  if (answers.length === 0) {
    res.status(200).json({
      success: true,
      data: { saved: true, count: 0 },
    });
    return;
  }

  if (answers.length > 500) {
    res.status(400).json({
      success: false,
      error: "Too many answers in one batch",
    });
    return;
  }

  const session = await db.collection("exam_sessions").findOne(
    { _id: new ObjectId(sessionId), userId: new ObjectId(userId) },
    { projection: { status: 1, "timerState.pausedAt": 1 } },
  );

  if (!session) {
    res.status(404).json({
      success: false,
      error: "Session not found",
    });
    return;
  }

  if (session.status !== "in_progress") {
    res.status(400).json({
      success: false,
      error: "Session is not in progress",
    });
    return;
  }

  if ((session as { timerState?: { pausedAt?: unknown } }).timerState?.pausedAt) {
    res.status(409).json({
      success: false,
      error: "Session is paused. Resume before answering.",
    });
    return;
  }

  const now = new Date();

  const validAnswers = answers.filter(
    (a): a is BulkAnswer =>
      Boolean(a) &&
      typeof a.questionId === "string" &&
      ObjectId.isValid(a.questionId) &&
      isValidAnswer(a.answer),
  );

  const ops: AnyBulkWriteOperation[] = validAnswers.map((a) => ({
    updateOne: {
      filter: {
        _id: new ObjectId(sessionId),
        "questions.questionId": new ObjectId(a.questionId),
      },
      update: {
        $set: {
          "questions.$.userAnswer": a.answer,
          "questions.$.answeredAt": now,
          ...(typeof a.timeSpent === "number"
            ? { "questions.$.timeSpent": Math.max(0, Math.round(a.timeSpent)) }
            : {}),
        },
      },
    },
  }));

  if (ops.length === 0) {
    res.status(400).json({
      success: false,
      error: "No valid answers in payload",
    });
    return;
  }

  const result = await db.collection("exam_sessions").bulkWrite(ops, {
    ordered: false,
  });

  res.status(200).json({
    success: true,
    data: {
      saved: true,
      count: result.modifiedCount,
    },
  });
}
