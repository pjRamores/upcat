import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const body = (req.body ?? {}) as {
    sessionId?: string;
    deviceId?: string;
    localSnapshot?: {
      answeredQuestions?: Array<{
        questionId: string;
        answer: string | null;
        answeredAt?: string;
        timeSpent?: number;
      }>;
      timer?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };

  if (!body.sessionId || !ObjectId.isValid(body.sessionId)) {
    return res.status(400).json({ success: false, error: "Valid sessionId required" });
  }

  const db = await getDb();
  const sessionId = new ObjectId(body.sessionId);
  const session = await db.collection("exam_sessions").findOne({ _id: sessionId, userId: user._id });
  if (!session) return res.status(404).json({ success: false, error: "Session not found" });

  const localAnswers = body.localSnapshot?.answeredQuestions || [];
  const merged = new Map<string, { answer: string | null; answeredAt: Date; timeSpent: number }>();

  for (const q of session.questions || []) {
    const qId = q.questionId.toString();
    merged.set(qId, {
      answer: q.userAnswer ?? null,
      answeredAt: new Date(q.answeredAt || 0),
      timeSpent: Number(q.timeSpent || 0),
    });
  }

  for (const ans of localAnswers) {
    if (!ObjectId.isValid(ans.questionId)) continue;
    const qId = ans.questionId;
    const incomingAt = new Date(ans.answeredAt || Date.now());
    const current = merged.get(qId);
    if (!current || incomingAt.getTime() >= current.answeredAt.getTime()) {
      merged.set(qId, {
        answer: ans.answer,
        answeredAt: incomingAt,
        timeSpent: Number(ans.timeSpent || 0),
      });
    }
  }

  for (const [qId, row] of merged.entries()) {
    await db.collection("exam_sessions").updateOne(
      { id: sessionId, "questions.questionId": new ObjectId(qId) },
      {
        $set: {
          "questions.$.userAnswer": row.answer,
          "questions.$.answeredAt": row.answeredAt,
          "questions.$.timeSpent": row.timeSpent,
          "offlineData.wasOffline": true,
          "offlineData.recoveredFrom": sessionId,
        },
      },
    );
  }

  await db.collection("session_recovery").updateMany(
    { userId: user._id, sessionId, status: "active" },
    {
      $set: {
        status: "recovered",
        recoveredAt: new Date(),
        recoveredOnDevice: body.deviceId || "unknown",
        updatedAt: new Date(),
      },
    },
  );

  return res.status(200).json({
    success: true,
    data: {
      recovered: true,
      mergedState: {
        answeredQuestions: Array.from(merged.entries()).map(([questionId, value]) => ({
          questionId,
          answer: value.answer,
          answeredAt: value.answeredAt,
          timeSpent: value.timeSpent,
        })),
      },
      timerAdjustments: 0,
    },
  });
}
function process<T>(data: T[], callback: (item: T) => void) {
  data.forEach(callback);
}