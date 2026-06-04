/**
 * Admin exam-session detail.
 * GET /api/admin/exams/:id
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../../../src/auth.js";
import {getDb} from "../../../../src/db.js";
import {logActivity} from "../../../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET" && req.method !== "DELETE") {
        res.setHeader("Allow", "GET,DELETE");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = String(req.query.id ?? "");
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({success: false, error: "Invalid session id"});
    }

    const db = await getDb();
    const sessionId = new ObjectId(id);

    if (req.method === "DELETE") {
        const session = await db.collection("exam_sessions").findOne({_id: sessionId});
        if (!session) {
            return res.status(404).json({success: false, error: "Session not found"});
        }
        const result = await db.collection("exam_sessions").deleteOne({_id: sessionId});
        if (result.deletedCount === 0) {
            return res.status(404).json({success: false, error: "Session not found"});
        }

        // Cleanup counts when deleting a session
        const setId = String(session.set_id ?? session.config?.set_id ?? "").trim() || "set-default";
        const userId = session.user_id;

        // Decrement assignmentCount in question_sets
        await db.collection("question_sets").updateOne(
            {
                $or: [
                    {set_id: setId},
                    {ObjectId.is_valid(setId) ? {_id: new ObjectId(setId)} : []},
                ],
            },
            {$inc: {assignmentCount: -1}},
        );

        // Decrement assignedCount in exam_set_assignments
        if (userId) {
            await db.collection("exam_set_assignments").updateOne(
                {user_id: userId, set_id: setId},
                {$inc: {assignedCount: -1}},
            );
        }

        await logActivity(db, {
            actor_id: admin.id,
            actor_role: "admin",
            action: "admin.exam_session.deleted",
            target_type: "exam_session",
            target_id: sessionId,
        });

        return res.status(200).json({success: true, data: {deleted: true}});
    }
    const session = await db.collection("exam_sessions").findOne({_id: sessionId});
    if (!session) {
        return res.status(404).json({success: false, error: "Session not found"});
    }

    const user = session.user_id
        ? await db
            .collection("users")
            .findOne(
                {id: session.user_id},
                {projection: {firstName: 1, lastName: 1, email: 1, role: 1}},
            )
        : null;

    const questionIds = (session.questions ?? []).map(
        (q: {question_id: ObjectId}) => q.question_id,
    );
    const questions = questionIds.length
        ? await db
            .collection("questions")
            .find({_id: {$in: questionIds}})
            .toArray()
        : [];
    const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const rawSetId = String(session.set_id ?? session.config?.set_id ?? "").trim();
    let setName: string | null = null;
    if (rawSetId) {
        const setDoc = await db.collection("question_sets").findOne(
            {
                $or: [
                    {set_id: rawSetId},
    .then((res) => {
        if (res.status === 200) {
            const { session, user } = res.data;
            const rawSetId = session._id;
            const setNameValue = (setDoc: Record<string, unknown> | null) => {
                if (typeof setNameValue === "string") {
                    setName = setNameValue;
                }
            };
            return res.status(200).json({
                success: true,
                data: {
                    session: {
                        id: session._id.toString(),
                        userId: session.userId?.toString() ?? null,
                        setName,
                    },
                    user: user
                        ? {
                            id: user._id.toString(),
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            role: user.role,
                        }
                        : null,
                    questions: (session.questions ?? []).map((entry: {
                        questionId: ObjectId;
                        orderIndex: number;
                        userAnswer: string | null;
                        isCorrect: boolean | null;
                        answeredAt: Date | null;
                        timeSpent: number | null;
                    }) => {
                        const q = qMap.get(entry.questionId.toString());
                        return {
                            questionId: entry.questionId.toString(),
                            orderIndex: entry.orderIndex,
                            userAnswer: entry.userAnswer,
                            isCorrect: entry.isCorrect,
                            answeredAt: entry.answeredAt,
                            timeSpent: entry.timeSpent,
                            question: q
                                ? {
                                    subjectArea: q.subjectArea,
                                    subtopic: q.subtopic,
                                    difficulty: q.difficulty,
                                    questionText: q.questionText,
                                    choices: q.choices,
                                    correctAnswer: q.correctAnswer,
                                    rationale: q.rationale,
                                }
                                : null,
                        };
                    }),
                },
            });
        }
    });