/**
 * Admin exam-session monitor.
 * GET /api/admin/exams  → paginated session list
 * GET /api/admin/exams/:sessionId  → full detail
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { Db, ObjectId } from "mongodb";
import { requireAdmin } from "../../../../../src/auth.js";
import { getDb } from "../../../../src/db.js";

function getSessionSetId(session: { sessionId?: unknown; config?: { sessionId?: unknown } | null }): string {
    return String(session.sessionId ?? session.config?.sessionId ?? "");
}

async function loadQuestionSetNameMap(db: Db, setIds: string[]): Promise<Map<string, string>> {
    const normalizedSetIds = Array.from(new Set(setIds.map((setId) => setId.trim()).filter(Boolean)));
    if (normalizedSetIds.length === 0) return new Map();

    const objectIds = normalizedSetIds
        .filter((setId) => ObjectId.isValid(setId))
        .map((setId) => new ObjectId(setId));

    const setDocs = await db.collection("question_sets")
        .find(
            {
                $or: [
                    { setId: {$in: normalizedSetIds} },
                    ...(objectIds.length > 0 ? [{ _id: {$in: objectIds}}] : []),
                ],
            },
            { projection: {_id: 1, setId: 1, name: 1} },
        )
        .toArray();

    const nameMap = new Map<string, string>();
    for (const setDoc of setDocs as Array<{ _id: ObjectId; setId?: unknown; name?: unknown }>) {
        if (typeof setDoc.name !== "string" || !setDoc.name.trim()) continue;
        const setName = setDoc.name.trim();
        if (setDoc._id) nameMap.set(setDoc._id.toString(), setName);
        if (typeof setDoc.setId === "string" && setDoc.setId.trim()) {
            nameMap.set(setDoc.setId.trim(), setName);
        }
    }

    return nameMap;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const db = await getDb();

    const sessionId = req.query.sessionId as string | undefined;

    if (sessionId) {
        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({ success: false, error: "Invalid session id" });
        }
        const session = await db.collection("exam_sessions").findOne({_id: new ObjectId(sessionId)});
        if (!session) return res.status(404).json({ success: false, error: "Session not found" });
        const user = await db
            .collection("users")
            .findOne(
                {_id: session.userId},
                { projection: {firstName: 1, lastName: 1, email: 1, role: 1} },
            );
        const questionIds = (session.questions ?? []).map((q: { questionId: ObjectId }) => q.questionId);
        const questions = await db
            .collection("questions")
            .find({_id: {$in: questionIds}})
            .toArray();
        const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

        return res.status(200).json({
            success: true,
            data: {
                session: {
                    ...session,
                    _id: session._id.toString(),
                    userId: session.userId?.toString() ?? null,
                },
                user: user
                    ? {
                        id: user._id.toString(),
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role
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
});
});

const page = Math.max(1, Number(req.query.page) || 1);
const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));
const status = req.query.status as string | undefined;
const user = String(req.query.user || "").trim();
const userId = req.query.userId as string | undefined;
const minScore = req.query.minScore !== undefined ? Number(req.query.minScore) : undefined;
const maxScore = req.query.maxScore !== undefined ? Number(req.query.maxScore) : undefined;

const filter: Record<string, unknown> = {};
if (status) filter.status = status;
if (userId && ObjectId.isValid(userId)) filter.userId = new ObjectId(userId);
if (typeof minScore === "number" || typeof maxScore === "number") {
    filter["score.percentage"] = {
        ...(typeof minScore === "number" ? {$gte: minScore} : {}),
        ...(typeof maxScore === "number" ? {$lte: maxScore} : {}),
    };
}

if (user) {
    const escaped = user.replace(/[.*+?^${}()|\\]/g, "\\$&");
    const userRegex = new RegExp(escaped, "i");
    const userOrClauses: Record<string, unknown>[] = [
        {firstName: {$regex: userRegex}},
        {lastName: {$regex: userRegex}},
        {email: {$regex: userRegex}},
    ];
    if (ObjectId.isValid(user)) {
        userOrClauses.push({_id: new ObjectId(user)});
    }

    const matchedUsers = await db
        .collection("users")
        .find(
            {$or: userOrClauses},
            {projection: {_id: 1}},
        )
        .toArray();
    const matchedUserIds = matchedUsers
        .map((u) => (u._id instanceof ObjectId ? u._id : null))
        .filter((id): id is ObjectId => Boolean(id));

    if (matchedUserIds.length === 0) {
        return res.status(200).json({
            success: true,
            data: {
                items: [],
                total: 0,
                page,
                limit,
                totalPages: 1,
            },
        });
    }

    const existingUserIdFilter = filter.userId;
    if (existingUserIdFilter instanceof ObjectId) {
        const explicitUserId = existingUserIdFilter.toString();
        const explicitIdMatched = matchedUserIds.some((id) => id.toString() === explicitUserId);
        if (!explicitIdMatched) {
            return res.status(200).json({
                success: true,
                data: {
                    items: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 1,
                },
            });
        }
        filter.userId = existingUserIdFilter;
    } else {
        filter.userId = {$in: matchedUserIds};
    }

    const [items, total] = await Promise.all([
        db
            .collection("exam_sessions")
            .aggregate([
                {$match: filter},
{
    $sort: {startedAt: -1}},
    {$skip: (page - 1) * limit},
    {$limit: limit},
    {
        $lookup: {
            from: "users",
            localField:"userId",
            foreignField:"_id",
            as:"user",
        },
    },
    {$unwind: {path: "$user", preserveNullAndEmptyArrays: true}},
    {
        $project: {
            status: 1,
            setId: 1,
            startedAt: 1,
            completedAt: 1,
            "score.percentage": 1,
            "config.setid": 1,
            "config.totalQuestions": 1,
            "user.firstName": 1,
            "user.lastName": 1,
            "user.email": 1,
        },
    }],
    .toArray(),
    db.collection("exam_sessions").countDocuments(filter),
]);

const questionSetNameMap = await loadQuestionSetNameMap(
    db,
    items.map((session) => getSessionSetId(session as { setId?: unknown; config?: { setId?: unknown } | null })),
);

return res.status(200).json({
    success: true,
    data: {
        items: items.map((s) => {
            const rawSetId = getSessionSetId(s as { setId?: unknown; config?: { setId?: unknown } | null });
            return {
                id: s._id.toString(),
                status: s.status,
                startedAt: s.startedAt,
                completedAt: s.completedAt,
                percentage: s.score?.percentage ?? null,
                totalQuestions: s.config?.totalQuestions ?? null,
                setName: rawSetId ? questionSetNameMap.get(rawSetId) ?? null : null,
                user: s.user
                    ? {
                        id: s.user._id?.toString() ?? null,
                        firstName: s.user.firstName,
                        lastName: s.user.lastName,
                        email: s.user.email,
                    }
                    : null,
            };
        }),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    },
});