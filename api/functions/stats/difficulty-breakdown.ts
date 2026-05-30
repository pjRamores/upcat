import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {extractToken} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {loadCompletedSessions, loadQuestionMeta} from "../../src/statsHelpers.js";
import type {Difficulty} from "@upcat/shared";
import {DIFFICULTIES} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const payload = extractToken(req);
  if (!payload) return res.status(401).json({success: false, error: "Unauthorized"});

  const db = await getDb();
  const sessions = await loadCompletedSessions(db, new ObjectId(payload.userId));

  const allIds: ObjectId[] = [];
  for (const s of sessions) for (const q of s.questions) allIds.push(q.questionId);
  const meta = await loadQuestionMeta(db, allIds);

  const tally: Record<Difficulty, {totalQuestions: number; correct: number}} = {
    easy: {totalQuestions: 0, correct: 0},
    medium: {totalQuestions: 0, correct: 0},
    hard: {totalQuestions: 0, correct: 0},
    very_hard: {totalQuestions: 0, correct: 0},
  };

  for (const s of sessions) {
    for (const q of s.questions) {
      const m = meta.get(q.questionId.toString());
      if (!m) continue;
      tally[m.difficulty].totalQuestions++;
      if (q.isCorrect) tally[m.difficulty].correct++;
    }
  }

  const data = DIFFICULTIES.map((d) => ({
    difficulty: d as Difficulty,
    totalQuestions: tally[d].totalQuestions,
    correct: tally[d].correct,
    accuracy:
      tally[d].totalQuestions === 0
    ? 0
    : Math.round((tally[d].correct / tally[d].totalQuestions) * 100),
  }));
  return res.status(200).json({success: true, data});
}