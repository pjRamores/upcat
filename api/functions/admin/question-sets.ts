/**
 * Question sets - admin CRUD.
 *
 * GET /api/admin/question-sets -> paginated list
 * POST /api/admin/question-sets -> create new set
 * GET /api/admin/question-sets/:id -> get one set detail
 * PUT /api/admin/question-sets/:id -> update set
 * DELETE /api/admin/question-sets/:id -> soft-delete set (mark inactive)
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {syncQuestionSetPublishedCounts} from "../../src/questionSetSync.js";
import {SUBJECT_AREAS, type SubjectArea} from "@upcat/shared";

type SubjectDistribution = Record<SubjectArea, { questions: number; timeLimit: number }>;

function isDuplicateSetIdError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const maybe = error as {
        code?: unknown;
        errorResponse?: { code?: unknown; keyPattern?: Record<string, unknown> };
        keyPattern?: Record<string, unknown>;
    };

    const code = Number(maybe.code ?? maybe.errorResponse?.code);
    if (code !== 11000) return false;

    const keyPattern = maybe.keyPattern ?? maybe.errorResponse?.keyPattern;
    return Boolean(keyPattern && Number(keyPattern.setId) === 1);
}

function normalizeDistribution(raw: unknown): SubjectDistribution {
    const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    return Object.fromEntries(
        SUBJECT_AREAS.map((subject) => {
            const entry = source[subject];

            if (entry && typeof entry === "object") {
                const cfg = entry as Partial<{ questions: number; timeLimit: number }>;
                return [
                    subject,
                    {
                        questions: Math.max(0, Number.isFinite(cfg.questions) ? Math.floor(Number(cfg.questions)) : 0),
                        timeLimit: Math.max(0, Number.isFinite(cfg.timeLimit) ? Math.floor(Number(cfg.timeLimit)) : 0),
                    },
                ];
            }

            if (typeof entry === "number" && Number.isFinite(entry)) {
                return [subject, { questions: Math.max(0, Math.floor(entry)), timeLimit: 0 }];
            }

            return [subject, { questions: 0, timeLimit: 0 }];
        }),
    ) as SubjectDistribution;
}

function computeTotals(distribution: SubjectDistribution): { totalQuestions: number; totalTimeLimit: number } {
    const totalQuestions = SUBJECT_AREAS.reduce((sum, subject) => sum + (distribution[subject]?.questions ?? 0), 0);
    const totalTimeLimit = SUBJECT_AREAS.reduce((sum, subject) => sum + (distribution[subject]?.timeLimit ?? 0), 0);
    return {totalQuestions, totalTimeLimit};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const db = await getDb();
    const id = req.query.id as string | undefined;

    if (req.method === "GET") {
        return id ? getDetail(req, res, db, id) : listSets(req, res, db);
    }
    if (req.method === "POST" && !id) return createSet(req, res, db, admin._id);
    if (req.method === "PUT" && id) return updateSet(req, res, db, admin._id, id);
    if (req.method === "DELETE" && id) return deleteSet(req, res, db, admin._id, id);

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({success: false, error: "Method not allowed"});
}

async function listSets(req: VercelRequest, res: VercelResponse, db: Awaited<ReturnType<typeof getDb>>) {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
        const sort = (req.query.sort as string | undefined)?.trim() || "createdAt";
        const order = (req.query.order as string | undefined)?.trim() === "asc" ? 1 : -1;

        const col = db.collection("question_sets");
        const total = await col.countDocuments({});

        const docs = await col
            .find({})
            .sort([{[sort]: order})
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        const sets = await Promise.all(
docs.map(async (doc: any) => ({
    ...doc,
    usageCount: await db.collection("exam_sessions").countDocuments({ "config.setId": doc._id?.toString() }),
}));

return res.status(200).json({
    success: true,
    data: {
        items: sets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    },
});

} catch (err) {
    console.error("[question-sets] list error:", err);
    return res.status(500).json({success: false, error: "Failed to list question sets"});
}

async function getDetail(
    req: VercelRequest,
    res: VercelResponse,
    db: Awaited<ReturnType<typeofgetDb>>,
    id: string,
) {
    try {
        const col = db.collection("question_sets");
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return res.status(400).json({success: false, error: "Invalid set ID format"});
        }

        const doc = await col.findOne({_id: objectId});

        if (!doc) return res.status(404).json({success: false, error: "Question set not found"});

        const usageCount = await db.collection("exam_sessions").countDocuments({"config.setId": id});
        const questionCount = await db.collection("questions").countDocuments({setId: id});

        return res.status(200).json({
            success: true,
            data: {
                ...doc,
                usageCount,
                questionCount,
            },
        });
    } catch (err) {
        console.error("[question-sets] get detail error:", err);
        return res.status(500).json({success: false, error: "Failed to get question set"});
    }
}

async function createSet(
    req: VercelRequest,
    res: VercelResponse,
    db: Awaited<ReturnType<typeofgetDb>>,
    adminId: ObjectId,
) {
    try {
        const {name, description, distribution: rawDistribution, priority: rawPriority} = req.body as Record<string, any>;

        // Validation
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({success: false, error: "name is required"});
        }

        const priority = rawPriority === undefined ? 1 : Math.min(100, Math.max(1, Math.floor(Number(rawPriority) || 1)));
        if (rawPriority !== undefined && (typeof rawPriority !== "number" || rawPriority < 1 || rawPriority > 100)) {
            return res.status(400).json({success: false, error: "priority must be a number between 1 and 100"});
        }

        if (!rawDistribution || typeof rawDistribution !== "object") {
            return res.status(400).json({success: false, error: "distribution is required"});
        }

        const normalizedDistribution = normalizeDistribution(rawDistribution);
        const distribution = Object.fromEntries(
            SUBJECT_AREAS.map((subject) => [
                subject,
                {
                    questions: 0,
                    timeLimit: Math.max(0, Number(normalizedDistribution[subject]?.timeLimit ?? 0)),
                },
            ]),
        ) as SubjectDistribution;
        const {totalQuestions, totalTimeLimit} = computeTotals(distribution);

        if (totalTimeLimit <= 0) {
            return res.status(400).json({success: false, error: "Total time limit must be greater than 0"});
        }

        // Validate all subjects in distribution are valid
        for (const subject of Object.keys(distribution)) {
if (!SUBJECT AREAS.includes(subject as SubjectArea)) {
    return res.status(400).json({success: false, error: 'Invalid subject: ${subject}'});
}

const now = new Date().toISOString();
const setObjectId = new ObjectId();
const setId = setObjectId.toString();
const newSet: any = {
    _id: setObjectId,
    setId,
    name: name.trim(),
    description: description?.trim() || undefined,
    isActive: true,
    priority,
    totalQuestions,
    totalTimeLimit,
    distribution,
    difficultyMix: {easy: 0, medium: 0, hard: 0, very_hard: 0},
    createdAt: now,
    updatedAt: now,
    createdBy: adminId.toString(),
    usageCount: 0
};

const col = db.collection("question_sets");
const result = await col.insertOne(newSet);
await syncQuestionSetPublishedCounts(db, setId);
const createdDoc = await col.findOne({_id: result.insertedId});

await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question_set.created",
    targetType: "question_set",
    targetId: result.insertedId,
    metadata: {name, totalQuestions},
});

return res.status(201).json({
    success: true,
    data: createdDoc ? {...createdDoc, _id: result.insertedId} : {...newSet, _id: result.insertedId},
});
} catch (err) {
    console.error("[question-sets].create.error:", err);
    return res.status(500).json({success: false, error: "Failed to create question set"});
}

async function updateSet(
    req: VercelRequest,
    res: VercelResponse,
    db: Awaited<ReturnType<typeof getDb>>,
    adminId: ObjectId,
    id: string,
) {
    try {
        let objectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return res.status(400).json({success: false, error: "Invalid set ID format"});
        }

        const {name, description, distribution, totalTimeLimit, isActive, priority} = req.body as Record<string, any>;

        const col = db.collection("question_sets");
        const existing = await col.findOne({_id: objectId});

        if (!existing) {
            return res.status(404).json({success: false, error: "Question set not found"});
        }

        const updates: Record<string, any> = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({success: false, error: "name must be non-empty string"});
            }
            updates.name = name.trim();
        }

        if (description !== undefined) {
            updates.description = description?.trim() || undefined;
        }

        if (distribution !== undefined) {
            if (typeof distribution !== "object") {
                return res.status(400).json({success: false, error: "distribution must be an object"});
            }
            const normalizedDistribution = normalizeDistribution(distribution);
            // Subject item counts are read-only and are auto-synced from published questions.
            // Only allow admins to edit per-subject time limits here.
            const mergedDistribution = Object.fromEntries(
                SUBJECT AREAS.map((subject) => {
                    const existingEntry = (existing.distribution as Record<string, {
questions?: unknown
}) >> | undefined)?.[subject];
const nextEntry = normalizedDistribution[subject];
return [
    subject,
    {
        questions: Math.max(0, Number(existingEntry?.questions ?? 0)),
        timeLimit: Math.max(0, Number(nextEntry?.timeLimit ?? 0)),
    },
], as SubjectDistribution;
const normalizedTotals = computeTotals(mergedDistribution);

if (normalizedTotals.totalTimeLimit <= 0) {
    return res.status(400).json({ success: false, error: "Total time limit must be greater than 0" });
}

updates.distribution = mergedDistribution;
updates.totalQuestions = normalizedTotals.totalQuestions;
updates.totalTimeLimit = normalizedTotals.totalTimeLimit;

if (totalTimeLimit !== undefined) {
    if (typeof totalTimeLimit !== "number" || totalTimeLimit <= 0) {
        return res.status(400).json({ success: false, error: "totalTimeLimit must be a positive number" });
    }
    updates.totalTimeLimit = totalTimeLimit;
}

if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
        return res.status(400).json({ success: false, error: "isActive must be a boolean" });
    }
    updates.isActive = isActive;
}

if (rawPriority !== undefined) {
    const p = Math.floor(Number(rawPriority) || 1);
    if (!Number.isFinite(p) || p < 1 || p > 100) {
        return res.status(400).json({ success: false, error: "priority must be a number between 1 and 100" });
    }
    updates.priority = p;
}

if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: "No updates provided" });
}

// Backfill legacy docs that do not have a setId so question lookups stay consistent.
// Guard the write because older data can already have a conflicting setId in another doc.
if (!existing.setId || !String(existing.setId).trim()) {
    const conflictingSet = await col.findOne(
        {
            setId: id,
            _id: {$ne: objectId},
        },
        {projection: {_id: 1}},
    );

    if (!conflictingSet) {
        updates.setId = id;
    } else {
        console.warn("[question-sets] skipped setId backfill due to existing conflict", {
            setObjectId: id,
            conflictingSetObjectId: String(conflictingSet._id),
        });
    }
}

updates.updatedAt = new Date().toISOString();

let result: Record<string, any> | { value?: Record<string, any> | null } | null;
try {
    result = await col.findOneAndUpdate(
        {_id: objectId},
        {$set: updates},
        {returnDocument: "after"},
    );
} catch (error) {
    if (isDuplicateSetIdError(error)) {
        return res.status(409).json({ success: false, error: "Question set ID already exists" });
    }
    throw error;
}

// mongodb@6 returns the updated document directly (or null), while older
// versions returned an object with a .value property.
const updatedDoc = (result && typeof result === "object" && "value" in result
    ? (result as { value?: Record<string, any> | null }).value
    : result) as Record<string, any> | null;

if (!updatedDoc) {
    return res.status(404).json({ success: false, error: "Question set not found" });
}

await syncQuestionSetPublishedCounts(db, id);
const refreshedDoc = await col.findOne({_id: objectId});

await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question_set_updated",
targetType: "question_set",
targetId: id,
metadata: {changes: Object.keys(updates)},
});

return res.status(200).json({
    success: true,
    data: refreshedDoc ?? updatedDoc,
});
} catch (err) {
    console.error("[question-sets] update error:", err);
    return res.status(500).json({success: false, error: "Failed to update question set"});
}

async function deleteSet(
    req: VercelRequest,
    res: VercelResponse,
    db: Awaited<ReturnType<typeof getDb>>,
    adminId: ObjectId,
    id: string,
) {
    try {
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return res.status(400).json({success: false, error: "Invalid set ID format"});
        }

        const col = db.collection("question_sets");
        const existing = await col.findOne({_id: objectId});

        if (!existing) {
            return res.status(404).json({success: false, error: "Question set not found"});
        }

        // Soft delete: mark as inactive
        const result = await col.findOneAndUpdate(
            {_id: objectId},
            {$set: {isActive: false, updatedAt: new Date().toISOString()}},
            {returnDocument: "after"},
        );

        const deletedDoc = (result && typeof result === "object" && "value" in result
            ? (result as {value?: Record<string, any> | null}).value
            : result) as Record<string, any> | null;

        if (!deletedDoc) {
            return res.status(404).json({success: false, error: "Question set not found"});
        }

        await logActivity(db, {
            actorId: adminId,
            actorRole: "admin",
            action: "question_set.deleted",
            targetType: "question_set",
            targetId: id,
        });

        return res.status(200).json({
            success: true,
            data: deletedDoc,
        });
    } catch (err) {
        console.error("[question-sets] delete error:", err);
        return res.status(500).json({success: false, error: "Failed to delete question set"});
    }
}