/**
 * GET /api/practice/cards
 *
 * Paginated list of the user's practice cards, with optional filters
 * (status, subjectArea, search). Used by the Practice Stats / Deck page.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { type Document, type Filter, ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import type { PracticeCardListEntry, PracticeCardStatus } from "@upcat/shared";
import { PRACTICE_MODES } from "@upcat/shared";

const VALID_STATUS: PracticeCardStatus[] = ["new", "learning", "review", "mastered"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Reference to avoid an unused-import warning when constants change.
  void PRACTICE_MODES;

  const user = await requireUser(req, res);
  if (!user) return;

  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) ?? "20", 10) || 20));
  const statusParam = typeof req.query.status === "string" ? req.query.status : null;
  const subjectArea = typeof req.query.subjectArea === "string" ? req.query.subjectArea : null;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const db = await getDb();
  const col = db.collection("practice_cards");

  const filter: Filter<Document> = { userId: user._id };
  if (statusParam && VALID_STATUS.includes(statusParam as PracticeCardStatus)) {
    filter.status = statusParam;
  }
  if (subjectArea) {
    filter.subjectArea = subjectArea;
  }

  let matchedQuestionIds: ObjectId[] | null = null;

  if (search) {
    const questionDocs = await db
      .collection("questions")
      .find({
        questionText: { $regex: search, $options: "i" },
      })
      .project({ _id: 1 })
      .toArray();

    matchedQuestionIds = questionDocs.map((q) => q._id as ObjectId);

    if (matchedQuestionIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          cards: [],
          page,
          limit,
          totalPages: 1,
          total: 0,
        },
      });
    }

    filter.questionId = { $in: matchedQuestionIds };
  }

  const total = await col.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);

  const cards = await col
    .find(filter)
    .sort({ nextReviewDate: 1, _id: 1 })
    .skip((safePage - 1) * limit)
    .limit(limit)
    .toArray();

  const questionIds = cards.map((c) => c.questionId as ObjectId);

  const qDocs = await db
    .collection("questions")
    .find({ _id: { $in: questionIds } })
    .project({ questionText: 1 })
    .toArray();

  const byQ = new Map(qDocs.map((d) => [d._id.toString(), d.questionText as string]));

  const entries: PracticeCardListEntry[] = cards.map((c) => {
    const preview = byQ.get((c.questionId as ObjectId).toString());

    return {
      cardId: c._id.toString(),
      questionId: (c.questionId as ObjectId).toString(),
      subjectArea: c.subjectArea,
      status: c.status as PracticeCardStatus,
      nextReviewDate:
        c.nextReviewDate instanceof Date
          ? c.nextReviewDate.toISOString()
          : String(c.nextReviewDate),
      intervalDays: Number(c.intervalDays),
      easeFactor: Number(c.easeFactor),
      correctCount: Number(c.correctCount ?? 0),
      incorrectCount: Number(c.incorrectCount ?? 0),
      lapses: Number(c.lapses ?? 0),
      questionPreview: (preview ?? "").slice(0, 160),
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      cards: entries,
      page: safePage,
      limit,
      totalPages,
      total,
    },
  });
}
