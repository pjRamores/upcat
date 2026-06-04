/**
 * Reviewee endpoint: flag a question.
 * POST /api/exam/questions/:questionId/flag
 *
 * Records the flag in question_flags and increments flagCount on the question itself for fast admin filtering.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { logActivity } from "../../src/activityLog.js";

const VALID_REASONS = new Set(["incorrect_answer", "typo", "unclear", "other"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const questionId = String(req.query.questionId ?? "");
  if (!ObjectId.isValid(questionId)) {
    return res.status(400).json({ success: false, error: "Invalid question id" });
  }

  const reason = String(req.body?.reason ?? "");
  if (!VALID_REASONS.has(reason)) {
    return res.status(400).json({ success: false, error: "Invalid reason" });
  }
  const comment = String(req.body?.comment ?? "").trim().slice(0, 1000);

  const db = await getDb();
  const qOid = new ObjectId(questionId);

  const exists = await db.collection("questions").findOne({ _id: qOid }, { projection: { _id: 1 } });
  if (!exists) return res.status(404).json({ success: false, error: "Question not found" });

  const flag = {
    questionId: qOid,
    userId: user._id,
    userEmail: user.email,
    reason,
    comment,
    status: "open",
    createdat: new Date(),
  };
  const result = await db.collection("question_flags").insertOne(flag);
  await db.collection("questions").updateOne({ _id: qOid }, {$inc: {flagCount: 1}});
  await logActivity(db, {
    actorId: user._id,
    actorRole: user.role ?? "reviewee",
    action: "question flagged",
    targetType: "question",
    targetId: qOid,
    metadata: { reason, flagId: result.insertedId.toString() },
  });

  return res.status(201).json({
    success: true,
    data: {_id: result.insertedId.toString(), questionId: questionId, status: "open"},
  });
}