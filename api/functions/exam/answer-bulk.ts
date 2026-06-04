import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireSessionAccess } from "../../src/examHelpers.js";

interface BulkAnswer {
    questionId: string;
    answer: "A" | "B" | "C" | "D" | null;
    timeSpent?: number;
}

interface BulkBody {
    answers?: BulkAnswer[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const ctx = await requireSessionAccess(req, res);
    if (!ctx) return;
    const { db, sessionId, userOid } = ctx;

    const { answers } = (req.body ?? {}) as BulkBody;
    if (!Array.isArray(answers)) {
        return res.status(400).json({ success: false, error: "answers array required" });
    }
    if (answers.length === 0) {
        return res.status(200).json({ success: true, data: { saved: true, count: 0 } });
    }
    if (answers.length > 500) {
        return res.status(400).json({ success: false, error: "Too many answers in one batch" });
    }

    const session = await db.collection("exam_sessions").findOne({ _id: sessionId, userId: userOid }, { projection: { status: 1, "timerState.pausedAt": 1 } });
    if (!session) {
        return res.status(404).json({ success: false, error: "Session not found" });
    }
    if (session.status !== "in_progress") {
        return res.status(400).json({ success: false, error: "Session is not in progress" });
    }
    if (session.timerState?.pausedAt) {
        return res.status(409).json({ success: false, error: "Session is paused. Resume before answering." });
    }

    const now = new Date();
    const ops = answers
        .filter((a) => a && ObjectId.isValid(a.questionId))
        .filter((a) => a.answer === null || ["A", "B", "C", "D"].includes(a.answer))
        .map((a) => ({
            updateOne: {
                filter: {
                    id: sessionId,
                    "questions.questionId": new ObjectId(a.questionId),
                },
                update: {
                    $set: {
                        "questions.$.userAnswer": a.answer ?? null,
                        "questions.$.answeredAt": now,
                        ...(typeof a.timeSpent === "number"
                            ? { "questions.$.timeSpent": Math.max(0, Math.round(a.timeSpent)) }
                            : {}),
                    },
                },
            },
        }));

    if (ops.length === 0) {
        return res.status(400).json({ success: false, error: "No valid answers in payload" });
    }
    const result = await db.collection("exam_sessions").bulkWrite(ops, { ordered: false });

    return res.status(200).json({
        success: true,
        data: { saved: true, count: result.modifiedCount },
    });
}