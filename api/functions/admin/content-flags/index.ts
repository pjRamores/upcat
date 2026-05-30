/**
 * Admin content-flag review.
 * GET /api/admin/content-flags => paginated list (filter by status)
 * PUT /api/admin/content-flags/:id => update status / resolution note
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";

const VALID_STATUS = new Set(["open", "resolved", "dismissed"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const db = await getDb();
  const flagId = req.query.id as string | undefined;

  if (req.method === "PUT" && flagId) {
    if (!ObjectId.isValid(flagId)) {
      return res.status(400).json({success: false, error: "Invalid flag id"});
    }
    const status = String(req.body?.status ?? "");
    if (!VALID_STATUS.has(status)) {
      return res.status(400).json({success: false, error: "Invalid status"});
    }
    const resolutionNote = String(req.body?.resolutionNote ?? "").trim().slice(0, 1000);
    const set: Record<string, unknown> = {
      status,
      resolutionNote,
      resolvedBy: admin._id,
      resolvedAt: new Date(),
    };
    const result = await db.collection("question_flags").updateOne({_id: new ObjectId(flagId)}, {$set: set});
    if (result.matchedCount === 0) {
      return res.status(404).json({success: false, error: "Flag not found"});
    }
    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: status === "resolved" ? "question.flag_resolved" : "question.flag_dismissed",
      targetType: "flag",
      targetId: flagId,
    });
    return res.status(200).json({success: true, data: {updated: true}});
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,PUT");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));
  const status = req.query.status as string | undefined;

  const filter: Record<string, unknown> = {};
  if (status && VALID_STATUS.has(status)) filter.status = status;

  const [items, total] = await Promise.all([
    db
    .collection("question_flags")
    .aggregate([
      {$match: filter},
      {$sort: {createdAt: -1}},
      {$skip: (page - 1) * limit},
      {$limit: limit},
    ]
    .$lookup: {
      from: "questions",
      localField: "questionId",
      foreignField: "_id",
      as: "question",
    },
    {},
    {$unwind: {path: "$question", preserveNullAndEmptyArrays: true}},
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {},
    {$unwind: {path: "$user", preserveNullAndEmptyArrays: true}},
    {
      $project: {
        reason: 1,
        comment: 1,
        status: 1,
        createdAt: 1,
        resolvedAt: 1,
        resolutionNote: 1,
        "question._id": 1,
        "question.subjectArea": 1,
        "question.difficulty": 1,
        "question.questionText": 1,
        "question.correctAnswer": 1,
        "user._id": 1,
        "user.firstName": 1,
        "user.lastName": 1,
        "user.email": 1,
      },
    },
  });
}
return res.status(200).json({
  success: true,
  data: {
    items: items.map((f) => ({
      _id: f._id.toString(),
      reason: f.reason,
      comment: f.comment,
      status: f.status,
      createdAt: f.createdAt,
      resolvedAt: f.resolvedAt ?? null,
      resolutionNote: f.resolutionNote ?? null,
      question: f.question
    } ? {
      _id: f.question._id?.toString?.(),
      subjectArea: f.question.subjectArea,
      difficulty: f.question.difficulty,
      preview: String(f.question.questionText ?? "").slice(0, 200),
      correctAnswer: f.question.correctAnswer,
    } : null,
    user: f.user
    ? {
      _id: f.user._id?.toString?.(),
      firstName: f.user.firstName,
      lastName: f.user.lastName,
      email: f.user.email,
    } : null
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  },
});