import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {canTransitionQuestionStatus, typeQuestionPublicationStatus} from "../../src/questionManagement.js";
import {syncQuestionSetPublishedCounts} from "../../src/questionSetSync.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "POST") {
    return updateWorkflow(req, res, admin._id);
  }

  if (req.method === "GET") {
    return listVersions(req, res);
  }

  res.setHeader("Allow", "GET,POST");
  return res.status(405).json({success: false, error: "Method not allowed"});
}

async function updateWorkflow(req: VercelRequest, res: VercelResponse, adminId: ObjectId) {
  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid question id"});
  }
  const oid = new ObjectId(id);

  const nextStatus = normalizeStatus(req.body?.status);
  if (!nextStatus) {
    return res.status(400).json({success: false, error: "status must be draft, in_review, published, or archived"});
  }

  const note = String(req.body?.note ?? "").trim();
  const db = await getDb();
  const questions = db.collection("questions");

  const current = await questions.findOne({_id: oid});
  if (!current) return res.status(404).json({success: false, error: "Question not found"});

  const currentStatus = normalizeStatus(current.publicationStatus) ?? "draft";
  if (!canTransitionQuestionStatus(currentStatus, nextStatus)) {
    return res.status(409).json({
      success: false,
      error: `Cannot transition from ${currentStatus} to ${nextStatus}`,
    });
  }

  const now = new Date();
  const version = Math.max(1, Number(current.version ?? 1)) + 1;
  await db.collection("question_versions").insertOne({
    questionId: oid,
    version: Number(current.version ?? 1),
    snapshot: {
      subjectArea: current.subjectArea,
      subtopic: current.subtopic,
      difficulty: current.difficulty,
      type: current.type,
      questionText: current.questionText,
      choices: current.choices,
      correctAnswer: current.correctAnswer,
      rationale: current.rationale,
      tags: current.tags ?? [],
      contentBlocks: current.contentBlocks ?? [],
      publicationStatus: currentStatus,
    },
    editedBy: adminId,
    editedAt: now,
    note: note || `Workflow transition to ${nextStatus}`,
  });

  await questions.updateOne({
    _id: oid,
    {
      $set: {
        publicationStatus: nextStatus,
        isDraft: nextStatus !== "published",
        publishedAt: nextStatus === "published" ? now : null,
        publishedBy: nextStatus === "published" ? adminId : null,
        workflowNote: note || null,
        version,
        updatedAt: now,
      },
    },
  });

  await syncQuestionSetPublishedCounts(db, String(current.setId ?? "")).trim();

  await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question.workflow_transition",
    targetType: "question",
    targetId: oid,
    metadata: {from: currentStatus, to: nextStatus, note, version},
  });

  return res.status(200).json({
    success: true,
    data: {
      questionId: oid.toString(),
from: currentStatus,
to: nextStatus,
version,
updatedAt: now.toISOString(),
},
});
}

async function listVersions(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid question id"});
  }
  const oid = new ObjectId(id);

  const db = await getDb();
  const versions = await db
    .collection("question_versions")
    .find({questionId: oid})
    .sort({version: -1})
    .limit(50)
    .toArray();

  return res.status(200).json({
    success: true,
    data: {
      items: versions.map((v) => ({
        _id: v._id.toString(),
        questionId: v.questionId.toString(),
        version: v.version,
        editedBy: v.editedBy?.toString() ?? null,
        editedAt: v.editedAt,
        note: v.note ?? "",
      })),
    },
  });
}

function normalizeStatus(input: unknown): QuestionPublicationStatus | null {
  const value = String(input ?? "").trim();
  if (value === "draft") return "draft";
  if (value === "in_review") return "in_review";
  if (value === "published") return "published";
  if (value === "archived") return "archived";
  return null;
}