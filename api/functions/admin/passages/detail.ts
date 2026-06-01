/**
 * Passage detail/update/soft-delete.
 * GET .../api/admin/passages/:id
 * PUT .../api/admin/passages/:id
 * DELETE /api/admin/passages/:id
 *
 * Delete returns 409 if the passage is still referenced by any
 * non-deleted questions and includes the dependent question IDs.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {SUBJECT_AREAS, type SubjectArea} from "@upcat/shared";
import {normalizeRichContentBlocks} from "../../src/questionManagement.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid passage id"});
  }
  const oid = new ObjectId(id);
  const db = await getDb();
  const col = db.collection("passages");

  if (req.method === "GET") {
    const doc = await col.findOne({_id: oid});
    if (!doc) return res.status(404).json({success: false, error: "Passage not found"});
    const linked = await db
      .collection("questions")
      .find({passageId: oid, isDeleted: {$ne: true}})
      .project({subjectArea: 1, subtopic: 1, difficulty: 1, questionText: 1, correctAnswer: 1})
      .toArray();
    return res.status(200).json({
      success: true,
      data: {
        passage: {
          doc,
          _id: doc._id.toString(),
        },
        questions: linked.map((q) => ({
          _id: q._id.toString(),
          subjectArea: q.subjectArea,
          subtopic: q.subtopic,
          difficulty: q.difficulty,
          questionText: String(q.questionText ?? ""),
          correctAnswer: q.correctAnswer ?? null,
        })),
      },
    });
  }

  if (req.method === "PUT") {
    const body = req.body ?? {};
    const set: Record<string, unknown> = {updatedAt: new Date()};
    for (const k of ["title", "content", "source"] as const) {
      if (typeof body[k] === "string") set[k] = String(body[k]).trim();
    }
    if (typeof body.subjectArea === "string") {
      if (!SUBJECT_AREAS.includes(body.subjectArea as SubjectArea)) {
        return res.status(400).json({success: false, error: "Invalid subjectArea"});
      }
      set.subjectArea = body.subjectArea;
    }
    if (body.contentBlocks !== undefined) {
      set.contentBlocks = normalizeRichContentBlocks(body.contentBlocks);
    }
    if (typeof body.publicationStatus === "string") {
      const status = body.publicationStatus;
      if (!["draft", "in_review", "published", "archived"].includes(status)) {
        return res.status(400).json({success: false, error: "Invalid publicationStatus"});
      }
      set.publicationStatus = status;
      set.publishedAt = status === "published" ? new Date() : null;
      set.publishedBy = status === "published" ? admin._id : null;
    }
    const result = await col.updateOne({_id: oid}, {$set: set});
    if (result.matchedCount === 0) {
      return res.status(404).json({success: false, error: "Passage not found"});
    }
    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: "passage updated",
      targetType: "passage",
      targetId: oid,
    });
    return res.status(200).json({success: true, data: {updated: true}});
  }

  if (req.method === "DELETE") {
    const dependents = await db
      .collection("questions")
      .find({passageId: oid, isDeleted: {$ne: true}})
      .project({_id: 1, subtopic: 1})
      .toArray();
    if (dependents.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete: ${dependents.length} active questions reference this passage.`,
        data: {dependents: dependents.map((d) => ({_id: d._id.toString(), subtopic: d.subtopic}}))},
});
const now = new Date();
await col.updateOne(
  {id: oid},
  {$set: {isDeleted: true, deletedAt: now, deletedBy: admin._id, updatedAt: now}},
);
await logActivity(db, {
  actorId: admin._id,
  actorRole: "admin",
  action: "passage.deleted",
  targetType: "passage",
  targetId: oid,
});
return res.status(200).json({success: true, data: {deleted: true}});
res.setHeader("Allow", "GET,PUT,DELETE");
return res.status(405).json({success: false, error: "Method not allowed"});
}