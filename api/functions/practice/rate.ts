/**
 * POST /api/practice/[sessionId]/rate
 * Applies the SM-2 rating for a card. Persists post-state to BOTH the 'practice_cards'.doc (ease/interval/reps/nextReviewDate/counters/lapses) AND the in-progress 'practice_sessions' card snapshot. Requires that the card has already been answered via /answer.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../../../src/auth.js";
import { getDb } from "../../../../src/db.js";
import { applySrsRating } from "../../../../src/practice.js";
import type { PracticeRatePayload, PracticeRateResponse, PracticeRating } from "@upcat/shared";

const VALID_RATINGS: PracticeRating[] = ["again", "hard", "good", "easy"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }
    const user = await requireUser(req, res);
    if (!user) return;

    const sessionIdRaw = (req.query.sessionId ?? req.query.id) as string | undefined;
    if (!sessionIdRaw || !ObjectId.isValid(sessionIdRaw)) {
        return res.status(400).json({ success: false, error: "Invalid sessionId" });
    }
    const sessionId = new ObjectId(sessionIdRaw);

    const body = (req.body ?? {}) as Partial<PracticeRatePayload>;
    if (!body.cardId || !ObjectId.isValid(body.cardId)) {
        return res.status(400).json({ success: false, error: "Invalid cardId" });
    }
    if (!body.rating || !VALID_RATINGS.includes(body.rating)) {
        return res.status(400).json({
            success: false,
            error: "Invalid rating. Expected one of: ${VALID_RATINGS.join(", ")}"
        });
    }
    const cardId = new ObjectId(body.cardId);
    const rating = body.rating;

    const db = await getDb();

    const session = await db
        .collection("practice_sessions")
        .findOne({ _id: sessionId, userId: user._id });
    if (!session) {
        return res.status(404).json({ success: false, error: "Session not found" });
    }
    if (session.status !== "in_progress") {
        return res.status(400).json({ success: false, error: "Session is not in progress" });
    }

    const sessionCards = (session.cards ?? []).as.Array<{
        cardId: ObjectId;
        isCorrect: boolean | null;
        rating: PracticeRating | null;
    }>;
    const idx = sessionCards.findIndex((c) => c.cardId.toString() === cardId.toString());
    if (idx === -1) {
        return res.status(404).json({ success: false, error: "Card not in this session" });
    }
    const sessionCard = sessionCards[idx];
    if (sessionCard.isCorrect === null) {
        return res.status(400).json({ success: false, error: "Answer this card first via /answer" });
    }
    if (sessionCard.rating !== null) {
        return res.status(400).json({ success: false, error: "Card has already been rated" });
    }

    const card = await db
        .collection("practice_cards")
        .findOne({ _id: cardId, userId: user._id });
    if (!card) {
        return res.status(404).json({ success: false, error: "Practice card not found" });
    }

    const now = new Date();
    const post = applySrsRating({
        status: card.status,
        easeFactor: Number(card.easeFactor),
        intervalDays: Number(card.intervalDays),
        repetitions: Number(card.repetitions),
    },
    rating,
    now,
    );

    const isCorrect = sessionCard.isCorrect === true;
    const lapseInc = rating === "again" ? 1 : 0;
    await db.collection("practice_cards").updateOne(
        { _id: cardId },
        {
            $set: {
                isCorrect: isCorrect,
                lapseCount: lapseInc,
                nextReviewDate: now,
                reps: post.reps,
                intervalDays: post.intervalDays,
                easeFactor: post.easeFactor,
                counters: post.counters,
            },
        },
    );
    return res.status(200).json({ success: true, error: null });
}
status: post.status,
easeFactor: post.easeFactor,
intervalDays: post.intervalDays,
repetitions: post.repetitions,
nextReviewDate: post.nextReviewDate,
lastReviewedAt: now,
updatedAt: now,
},
$inc: {
correctCount: isCorrect ? 1 : 0,
incorrectCount: isCorrect ? 0 : 1,
lapses: lapseInc,
totalReviews: 1,
},
};

await db.collection("practice_sessions").updateOne(
{_id: sessionOid, "cards.cardId": cardOid},
{
$set: {
[`cards.${idx}.rating`]: rating,
[Cards.${idx}.postEaseFactor]: post.easeFactor,
[Cards.${idx}.postIntervalDays]: post.intervalDays,
[Cards.${idx}.postRepetitions]: post.repetitions,
[Cards.${idx}.postStatus]: post.status,
[Cards.${idx}.postNextReviewDate]: post.nextReviewDate,
},
});

const data: PracticeRateResponse = {
cardId: cardOid.toString(),
status: post.status,
easeFactor: post.easeFactor,
intervalDays: post.intervalDays,
repetitions: post.repetitions,
nextReviewDate: post.nextReviewDate.toISOString(),
};
return res.status(200).json({success: true, data});
}