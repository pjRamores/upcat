/**
 * Question detail / update / soft-delete.
 *
 * GET /api/admin/questions/:id
 * PUT /api/admin/questions/:id
 * DELETE /api/admin/questions/:id ... (soft delete)
 *
 * The `:id` route param is supplied by Vercel's rewrite rules.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../../../src/auth.js";
import { getDB } from "../../../../src/db.js";
import { logActivity } from "../../../../src/activityLog.js";
import { syncQuestionSetPublishedCounts } from "../../../../src/questionSetSync.js";
import { validateQuestionPayload } from "./index.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = String(req.query.id ?? "");
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: "Invalid question id" });
    }
    const oid = new ObjectId(id);
    const db = await getDB();
    const col = db.collection("questions");

    if (req.method === "GET") {
        const doc = await col.findOne({ _id: oid });
        if (!doc) return res.status(404).json({ success: false, error: "Question not found" });
        const flagHistory = await db
            .collection("question_flags")
            .find({ questionId: oid })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
        const usageCount = await db
            .collection("exam_sessions")
            .countDocuments({ "questions.questionId": oid });
        return res.status(200).json({
            success: true,
            data: {
                question: {
                    ...doc,
                    _id: doc._id.toString(),
                    passageId: doc.passageId?.toString() ?? null,
                },
                usageCount,
                flagHistory: flagHistory.map((f) => ({
                    ...f,
                    _id: f._id.toString(),
                    questionId: f.questionId.toString(),
                    userId: f.userId?.toString() ?? null,
                })),
            },
        });
    }

    if (req.method === "PUT") {
        const validation = validateQuestionPayload((req.body ?? {} as Record<string, unknown>);
        if (!validation.ok) {
            return res.status(400).json({ success: false, error: validation.error });
        }
        const existing = await col.findOne({ _id: oid });
        if (!existing) return res.status(404).json({ success: false, error: "Question not found" });
        const previousSetId = String(existing.setId ?? "").trim();

        const changedFields: string[] = [];
        const previousValues: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(validation.value)) {
            if (JSON.stringify((existing as Record<string, unknown>)[k]) !== JSON.stringify(v)) {
                changedFields.push(k);
                previousValues[k] = (existing as Record<string, unknown>)[k];
            }
        }

        const now = new Date();
        await col.updateOne(
            { _id: oid },
            {
                $set: { ...validation.value, updatedAt: now },
                $push: {
                    editHistory: {
                        editedBy: admin._id,
                        editedAt: now,
                        changedFields,
                        previousValues,
                    },
                } as never,
            },
        );

        const nextSetId = String(validation.value.setId ?? previousSetId).trim();
        await syncQuestionSetPublishedCounts(db, previousSetId);
        if (nextSetId && nextSetId !== previousSetId) {
            await syncQuestionSetPublishedCounts(db, nextSetId);
        }

        await logActivity(db, {
            actorId: admin.id,
            actorRole: "admin",
            action: "question.updated",
        });
    }
}
.targetType: "question",
.targetId: oid,
.metadata: {changedFields},
});

return res.status(200).json({success: true, data: {changedFields}});
}

if (req.method === "DELETE") {
const existing = await col.findOne({_id: oid, isDeleted: {$ne: true}}, {projection: {setId: 1}});
if (!existing) {
    return res.status(404).json({success: false, error: "Question not found"});
}

const now = new Date();
const result = await col.updateOne(
    {id: oid, isDeleted: {$ne: true}},
    {$set: {isDeleted: true, deletedAt: now, deletedBy: admin._id, updatedAt: now}},
);
if (result.matchedCount === 0) {
    return res.status(404).json({success: false, error: "Question not found"});
}
await logActivity(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "question.deleted",
    targetType: "question",
    targetId: oid,
});

await syncQuestionSetPublishedCounts(db, String(existing.setID ?? ""));
return res.status(200).json({success: true, data: {deleted: true}});
}

res.setHeader("Allow", "GET,PUT,DELETE");
return res.status(405).json({success: false, error: "Method not allowed"});
}