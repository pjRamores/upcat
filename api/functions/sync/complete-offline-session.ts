import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const body = (req.body ?? {}).as({
    sessionId?: string,
    allAnswers?: Array<{questionId: string; answer: string | null; timeSpent?: number; answeredAt?: string}>,
    completedAt?: string,
    offlineData?: Record<string, unknown>;
  });

  if (!body.sessionId || !ObjectId.isValid(body.sessionId)) {
    return res.status(400).json({success: false, error: "Valid sessionId required"});
  }

  const db = await getDb();
  const sessionId = new ObjectId(body.sessionId);
  const session = await db.collection("exam_sessions").findOne({_id: sessionId, userId: user._id});
  if (!session) return res.status(404).json({success: false, error: "Session not found"});

  for (const ans of body.allAnswers || []) {
    if (!ObjectId.isValid(ans.questionId)) continue;
    await db.collection("exam_sessions").updateOne(
      {_id: sessionId, "questions.questionId": new ObjectId(ans.questionId)},
      {
        $set: {
          "questions.$.userAnswer": ans.answer,
          "questions.$.answeredAt": new Date(ans.answeredAt || Date.now()),
          "questions.$.timeSpent": Number(ans.timeSpent || 0),
        },
      },
    );
    await db.collection("exam_sessions").updateOne(
      {_id: sessionId},
      {
        $set: {
          status: "completed",
          completedAt: new Date(body.completedAt || Date.now()),
          offlineData: {
            wasOffline: true,
            totalOfflineMs: Number((body.offlineData as {
              totalOfflineMs?: number
            }) | undefined)?totalOfflineMs || 0),
            syncedAt: new Date(),
            recoveredFrom: null,
          },
        },
      },
    );
    return res.status(200).json({
      success: true,
      data: {
        scored: true,
        score: session.score || null,
      },
    });
  }
}