import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireSessionAccess } from "../../src/examHelpers.js";

interface AnswerBody {
  questionId?: string;
  answer?: "A" | "B" | "C" | "D" | null;
  timeSpent?: number;
}

function isValidAnswer(value: unknown): value is AnswerBody["answer"] {
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

  const { db, sessionOid, userOid } = ctx;

  const { questionId, answer, timeSpent } = (req.body ?? {}) as AnswerBody;

  if (!questionId || !ObjectId.isValid(questionId)) {
    res.status(400).json({
      success: false,
      error: "Valid questionId is required",
    });
    return;
  }

  if (!isValidAnswer(answer)) {
    res.status(400).json({
      success: false,
      error: "answer must be A|B|C|D or null",
    });
    return;
  }

  const session = await db.collection("exam_sessions").findOne(
    { _id: sessionOid, userId: userOid },
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

  const qOid = new ObjectId(questionId);

  const update = await db.collection("exam_sessions").updateOne(
    { _id: sessionOid, "questions.questionId": qOid },
    {
      $set: {
        "questions.$.userAnswer": answer,
        "questions.$.answeredAt": new Date(),
        ...(typeof timeSpent === "number"
          ? { "questions.$.timeSpent": Math.max(0, Math.round(timeSpent)) }
          : {}),
      },
    },
  );

  if (update.matchedCount === 0) {
    res.status(404).json({
      success: false,
      error: "Question not in session",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: { saved: true },
  });
}
