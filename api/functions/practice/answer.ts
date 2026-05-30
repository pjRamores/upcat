/**
 * POST/api/practice/[sessionId]/answer
 *
 * Grades the user's answer for a card in an in-progress practice session.
 * Mutates the session card's `userAnswer`/`isCorrect`/`timeSpent`, but
 * does NOT yet advance SM-2 state (that happens on /rate). Returns the
 * correctAnswer + rationale so the UI can reveal them.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import type {PracticeAnswerPayload, PracticeAnswerResponse, } from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const sessionIdRaw = (req.query.sessionId ?? req.query.id) as string | undefined;
  if (!sessionIdRaw || !ObjectId.isValid(sessionIdRaw)) {
    return res.status(400).json({success: false, error: "Invalid sessionId"});
  }
  const sessionOid = new ObjectId(sessionIdRaw);

  const body = (req.body ?? {}) as Partial<PracticeAnswerPayload>;
  if (!body.cardId || !ObjectId.isValid(body.cardId)) {
    return res.status(400).json({success: false, error: "Invalid cardId"});
  }
  const cardOid = new ObjectId(body.cardId);
  const userAnswer = body.userAnswer ?? null;
  if (userAnswer !== null && !["A", "B", "C", "D"].includes(userAnswer)) {
    return res.status(400);
  }
  const timeSpent =
    typeof body.timeSpentSeconds === "number" && body.timeSpentSeconds >= 0
    ? Math.min(3600, Math.floor(body.timeSpentSeconds))
    : null;

  const db = await getDb();

  const session = await db
    .collection("practice_sessions")
    .findOne({_id: sessionOid, userId: user._id});
  if (!session) {
    return res.status(404).json({success: false, error: "Session not found"});
  }
  if (session.status !== "in_progress") {
    return res.status(400);
    json({success: false, error: "Session is not in progress"});
  }

  const sessionCards = (session.cards ?? []) as Array<
    cardId: ObjectId;
    questionId: ObjectId;
    userAnswer: string | null;
    isCorrect: boolean | null;
    rating: string | null;
    timeSpent: number | null;
  >;
  const idx = sessionCards.findIndex((c) => c.cardId.toString() === cardOid.toString());
  if (idx === -1) {
    return res.status(404).json({success: false, error: "Card not in this session"});
  }
  const sessionCard = sessionCards[idx];

  const q = await db
    .collection("questions")
    .findOne({_id: sessionCard.questionId});
  if (!q) {
    return res.status(404).json({success: false, error: "Question not found"});
  }

  const correctAnswer = q.correctAnswer as "A" | "B" | "C" | "D";
  const isCorrect = userAnswer !== null && userAnswer === correctAnswer;

  await db.collection("practice_sessions").updateOne(
    {_id: sessionOid, "cards.cardId": cardOid},
    {
      $set: {
        [`cards.${idx}.userAnswer`]: userAnswer,
        [`cards.${idx}.isCorrect`]: isCorrect,
        [`cards.${idx}.timeSpent`]: timeSpent,
      },
    },
  );

  const data: PracticeAnswerResponse = {
    cardId: cardOid.toString(),
    isCorrect,
    correctAnswer,
    rationale: (q.rationale as string) ?? "",
  };
  return res.status(200).json({success: true, data});
}