/**
 * Question detail / update / soft-delete.
 *
 * GET /api/admin/questions/:id
 * PUT /api/admin/questions/:id
 * DELETE /api/admin/questions/:id (soft delete)
 *
 * The ':id' route param is supplied by Vercel's rewrite rules.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../../src/auth.js";
import { getDb } from "../../../src/db.js";
import { logActivity } from "../../../src/activityLog.js";
import { syncQuestionSetPublishedCounts } from "../../../src/questionSetSync.js";
import { validateQuestionPayload } from "./index.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid question id" });
  }

  const oid = new ObjectId(id);
  const db = await getDb();
  const col = db.collection("questions");

  if (req.method === "GET") {
    const doc = await col.findOne({ _id: oid });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }

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
    const validation = validateQuestionPayload(
      (req.body ?? {}) as Record<string, unknown>
    );

    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const existing = await col.findOne({ _id: oid });
    if (!existing) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }

    const existingRecord = existing as Record<string, unknown>;
    const validatedValue = validation.value as Record<string, unknown>;

    const previousSetId = String(
      existingRecord.set_id ?? existingRecord.setId ?? ""
    ).trim();

    const changedFields: string[] = [];
    const previousValues: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(validatedValue)) {
      if (JSON.stringify(existingRecord[k]) !== JSON.stringify(v)) {
        changedFields.push(k);
        previousValues[k] = existingRecord[k];
      }
    }

    const now = new Date();

    await col.updateOne(
      { _id: oid },
      {
        $set: {
          ...validatedValue,
          updatedAt: now,
        },
        $push: {
          editHistory: {
            editedBy: admin._id,
            editedAt: now,
            changedFields,
            previousValues,
          },
        },
      }
    );

    const nextSetId = String(
      validatedValue.set_id ?? validatedValue.setId ?? previousSetId
    ).trim();

    if (previousSetId) {
      await syncQuestionSetPublishedCounts(db, previousSetId);
    }
    if (nextSetId && nextSetId !== previousSetId) {
      await syncQuestionSetPublishedCounts(db, nextSetId);
    }

    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: "question_updated",
      targetType: "question",
      targetId: oid,
      metadata: { changedFields },
    });

    return res.status(200).json({ success: true, data: { changedFields } });
  }

  if (req.method === "DELETE") {
    const existing = await col.findOne(
      { _id: oid, isDeleted: { $ne: true } },
      { projection: { set_id: 1, setId: 1 } }
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }

    const existingRecord = existing as Record<string, unknown>;
    const setId = String(existingRecord.set_id ?? existingRecord.setId ?? "").trim();

    const now = new Date();
    const result = await col.updateOne(
      { _id: oid, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          deletedBy: admin._id,
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }

    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: "question.deleted",
      targetType: "question",
      targetId: oid,
    });

    if (setId) {
      await syncQuestionSetPublishedCounts(db, setId);
    }

    return res.status(200).json({ success: true, data: { deleted: true } });
  }

  res.setHeader("Allow", "GET,PUT,DELETE");
  return res.status(405).json({ success: false, error: "Method not allowed" });
}
