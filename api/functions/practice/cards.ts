/**
 * GET /api/practice/cards
 *
 * Paginated list of the user's practice cards, with optional filters
 * (status, subjectArea, search). Used by the Practice Stats / Deck page.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { type Document, type Filter, ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDB } from "../../src/db.js";
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
    const statusParam = (req.query.status as string) || null;
    const subjectArea = (req.query.subjectArea as string) || null;
    const search = ((req.query.search as string) || "").trim();

    const filter: Filter<Document> = { userId: user._id };
    if (statusParam && VALID_STATUS.includes(statusParam as PracticeCardStatus)) {
        filter.status = statusParam;
    }
    if (subjectArea) filter.subjectArea = subjectArea;

    const db = await getDB();
    const col = db.collection("practice_cards");

    const total = await col.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const cards = await col
        .find(filter)
        .sort({ nextReviewDate: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

    const questionIds = cards.map((c) => c.questionId as ObjectId);
    const qFilter: Filter<Document> = {_id: {$in: questionIds}};
    if (search) {
        qFilter.questionText = {$regex: search, $options: "i"};
    }
    const qDocs = await db
        .collection("questions")
        .find(qFilter)
        .project({questionText: 1})
        .toArray();
    const byQ = new Map(qDocs.map((d) => [d._id.toString(), d.questionText as string]));

    const entries: PracticeCardListEntry[] = cards
        .map((c) => {
            const preview = byQ.get(c.questionId as ObjectId).toString();
            if (search && !preview) return null;
            return {
                cardId: c._id.toString(),
                questionId: (c.questionId as ObjectId).toString(),
                subjectArea: c.subjectArea,
                status: c.status as PracticeCardStatus,
                nextReviewDate: c.nextReviewDate instanceof Date
                    ? c.nextReviewDate.toISOString()
                    : String(c.nextReviewDate),
                intervalDays: Number(c.intervalDays),
                easeFactor: Number(c.easeFactor),
                correctCount: Number(c.correctCount ?? 0),
                incorrectCount: Number(c.incorrectCount ?? 0),
                lapses: Number(c.lapses ?? 0),
                questionPreview: (preview ?? "").slice(0, 160),
            };
        })
        .filter((x: x is PracticeCardListEntry) => x !== null);

    return res.status(200).json({
        success: true,
        data: {
            cards: entries,
            page,
            limit,
            totalPages,
            total,
        },
    });
}