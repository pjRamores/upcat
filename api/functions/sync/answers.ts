import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";

interface SyncAnswer {
  questionId: string;
  answer: "A" | "B" | "C" | "D" | null;
  timeSpent: number;
  answeredAt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();
  const body = (req.body ?? {}) as {
    sessionId?: string;
    answers?: SyncAnswer[];
    deviceId?: string;
    syncedAt?: string;
    offlinePeriods?: Array<{ startedAt: string; endedAt: string; durationMs: number }>;
  };

  if (!body.sessionId || !ObjectId.isValid(body.sessionId)) {
    return res.status(400).json({ success: false, error: "Valid sessionId required" });
  }
  if (!Array.isArray(body.answers)) {
    return res.status(400).json({ success: false, error: "answers array required" });
  }

  const sessionId = new ObjectId(body.sessionId);
  const session = await db.collection("exam_sessions").findOne({ _id: sessionId, userId: user._id });
  if (!session) return res.status(404).json({ success: false, error: "Session not found" });

  if (session.status === "completed") {
    return res.status(409).json({ success: false, conflictType: "already_submitted" });
  }

  let accepted = 0;
  let skipped = 0;
  const conflicts: Array<Record<string, unknown>> = [];

  for (const ans of body.answers) {
    if (!ans.questionId || !ObjectId.isValid(ans.questionId)) {
      skipped += 1;
      continue;
    }

    const questionId = new ObjectId(ans.questionId);
    const answeredAt = new Date(ans.answeredAt || Date.now());
    const existingQuestion = (session.questions || []).find(
      (q: {
        questionId: ObjectId;
        answeredAt?: Date | null;
      }) => q.questionId.toString() === questionId.toString(),
    );

    if (!existingQuestion) {
      skipped += 1;
      continue;
    }

    const existingAnsweredAt = existingQuestion.answeredAt ? new Date(existingQuestion.answeredAt).getTime() : 0;
    const incomingAnsweredAt = Number.isFinite(answeredAt.getTime()) ? answeredAt.getTime() : Date.now();

    if (existingAnsweredAt > incomingAnsweredAt) {
      skipped += 1;
      conflicts.push({ questionId: ans.questionId, reason: "server_newer" });
      continue;
    }

    const update = await db.collection("exam_sessions").updateOne(
      { _id: sessionId, "questions.questionId": questionId },
      {
        $set: {
          "questions.$.userAnswer": ans.answer,
          "questions.$.timeSpent": Math.max(0, Math.round(ans.timeSpent || 0)),
          "questions.$.answeredAt": new Date(incomingAnsweredAt),
          "offlineData.wasOffline": true,
          "offlineData.syncedAt": new Date(),
        },
        $inc: {
          "offlineData.totalOfflineMs": Number(body.offlinePeriods || []).reduce((sum, p) => sum + (p.durationMs || 0), 0),
        },
        $addToSet: {
          "devices": {
            deviceId: body.deviceId || "unknown",
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
          },
        },
      },
    );
    if (update.modifiedCount > 0) accepted += 1;
    else skipped += 1;
  }

  await db.collection("sync_queue").insertOne({

userId: user_id,
deviceID: body.deviceId || "unknown",
type: "exam_answers",
payload: {
    sessionId: body.sessionId,
    questionId: ans.questionId,
    answer: ans.answer,
    timeSpent: ans.timeSpent,
},
occurredAt: new Date(incomingAnsweredAt),
receivedAt: new Date(),
processedAt: new Date(),
status: "completed",
failureReason: null,
retryCount: 0,
maxRetries: Number(process.env.SYNC_MAX_RETRIES || "5"),
conflict: null,
sequenceNumber: accepted + skipped,
batchId: null,
createdAt: new Date(),
expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

return res.status(200).json({
    success: true,
    data: {
        synced: true,
        answersAccepted: accepted,
        answersSkipped: skipped,
        conflicts,
    },
});