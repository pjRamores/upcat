import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireSessionAccess } from "../../src/examHelpers.js";

interface AnswerBody {
    questionId?: string;
    answer?: "A" | "B" | "C" | "D" | null;
    timeSpent?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const ctx = await requireSessionAccess(req, res);
    if (!ctx) return;
    const { db, sessionId, userId } = ctx;

    const { questionId, answer, timeSpent } = (req.body ?? {}) as AnswerBody;
    if (!questionId || !ObjectId.isValid(questionId)) {
        return res.status(400).json({ success: false, error: "Valid questionId is required" });
    }
    if (answer !== null && !["A", "B", "C", "D"].includes(answer ?? "")) {
        return res.status(400).json({ success: false, error: "answer must be A|B|C|D or null" });
    }

    const session = await db
        .collection("exam_sessions")
        .findOne(
            { _id: sessionId, userId: userId },
            { projection: { status: 1, "timerState.pausedAt": 1 } },
        );

    if (!session) {
        return res.status(404).json({ success: false, error: "Session not found" });
    }
    if (session.status !== "in_progress") {
        return res.status(400).json({ success: false, error: "Session is not in progress" });
    }
    if (session.timerState?.pausedAt) {
        return res.status(409).json({ success: false, error: "Session is paused. Resume before answering." });
    }

    const qoid = new ObjectId(questionId);
    const update = await db.collection("exam_sessions").updateOne(
        { _id: sessionId, "questions.questionId": qoid },
        {
            $set: {
                "questions.$.userAnswer": answer ?? null,
                "questions.$.answeredAt": new Date(),
                ...(typeof timeSpent === "number"
                    ? { "questions.$.timeSpent": Math.max(0, Math.round(timeSpent)) }
                    : {}),
            },
        },
    );

    if (update.matchedCount === 0) {
        return res.status(404).json({ success: false, error: "Question not in session" });
    }
    return res.status(200).json({ success: true, data: { saved: true } });
}