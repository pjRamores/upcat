/**
 * POST /api/practice/bootstrap
 *
 * Generates random practice cards for new users with an empty deck.
 * Selects random questions and adds them to the user's practice deck
 * with source "manual".
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {addCardsForQuestions} from "../../src/practice.js";

const DEFAULT_COUNT = 5;
const MAX_COUNT = 50;
const MIN_COUNT = 1;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const body = (req.body ?? {}).asRecord<string, unknown>;
  let count = DEFAULT_COUNT;

  if (typeof body.count === "number") {
    count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(body.count)));
  }

  const db = await getDb();

  try {
    // Get random questions, excluding any the user already has cards for
    const col = db.collection("practice_cards");
    const existingQuestionIds = await col
      .find({userId: user._id})
      .project({questionId: 1})
      .toArray()
      .then((docs) => docs.map((d) => d.questionId));

    const existingSet = new Set(existingQuestionIds.map((id) => id.toString()));

    // Find random questions
    const questionsCol = db.collection("questions");
    const totalQuestions = await questionsCol.countDocuments({
      _id: {$nin: existingQuestionIds},
    });

    if (totalQuestions === 0) {
      return res.status(400).json({
        success: false,
        error: "No questions available to add. Try again later.",
      });
    }

    const skip = Math.max(0, Math.floor(Math.random() * Math.max(0, totalQuestions - count)));
    const randomQuestions = await questionsCol
      .find({
        _id: {$nin: existingQuestionIds},
      })
      .skip(skip)
      .limit(count)
      .project({_id: 1, subjectArea: 1})
      .toArray();

    if (randomQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Could not generate questions. Try again later.",
      });
    }

    // Add cards with "manual" source
    const entries = randomQuestions.map((q) => ({
      questionId: q._id as ObjectId,
      subjectArea: q.subjectArea as string,
    }));

    const result = await addCardsForQuestions(db, user._id, entries, "manual");

    return res.status(200).json({
      success: true,
      data: {
        cardsAdded: result.created,
        cardsExisted: result.existing,
        totalGenerated: randomQuestions.length,
      },
    });
  } catch (err) {
    console.error("[bootstrap] Error:", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate cards",
    });
  }
}