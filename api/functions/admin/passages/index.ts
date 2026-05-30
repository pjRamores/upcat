/**
 * Passage management - GET/POST list & create.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {SUBJECT_AREAS, type} SubjectArea from "@upcat/shared";
import {normalizeRichContentBlocks} from "../../src/questionManagement.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const db = await getDb();
  const col = db.collection("passages");

  if (req.method === "GET") {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const search = (req.query.search as string) || undefined?.trim();
    const subjectArea = req.query.subjectArea as string || undefined;
    const setId = (req.query.setId as string) || undefined?.trim();

    const filter: Record<string, unknown> = {isDeleted: {$ne: true}};
    if (subjectArea) filter.subjectArea = subjectArea;
    if (search) {
      const r = new RegExp(search.replace(/[.*+?^${()}|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{title: r}, {source: r}];
    }

    if (setId) {
      const passageIds = await db
        .collection("questions")
        .distinct("passageId", {setId, passageId: {$exists: true, $ne: null}, isDeleted: {$ne: true}});
      filter._id = {$in: passageIds};
    }

    const [items, total] = await Promise.all([
      col.find(filter).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    const passageIds = items.map((p) => p._id);
    const counts = await db
      .collection("questions")
      .aggregate([
        {$match: {passageId: {$in: passageIds}, isDeleted: {$ne: true}}},
        {$group: {_id: "$passageId", n: {$sum: 1}}},
      ])
      .toArray();
    const countMap = new Map(counts.map((c) => [String(c._id), c.n]));

    return res.status(200).json({
      success: true,
      data: {
        items: items.map((p) => ({
          _id: p._id.toString(),
          title: p.title,
          source: p.source,
          subjectArea: p.subjectArea,
          contentPreview: String(p.content ?? "").slice(0, 200),
          questionCount: countMap.get(p._id.toString()) ?? 0,
          createdAt: p.createdAt,
        })),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();
    const source = String(body.source ?? "").trim();
    const subjectArea = String(body.subjectArea ?? "");
    if (!title || !content) {
      return res.status(400).json({success: false, error: "title and content are required"});
    }
    if (!SUBJECT_AREAS.includes(subjectArea as SubjectArea)) {
      return res.status(400).json({success: false, error: "Invalid subjectArea"});
    }
    const now = new Date();
    const doc = {
      title,
      content,
      source,
      subjectArea,
      contentBlocks: normalizeRichContentBlocks(body.contentBlocks),
      publicationStatus: "draft",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: admin._id,
    };
    const result = await col.insertOne(doc);
    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: "passage created",
      targetType: "passage",
      targetId: result.insertedId,
    });
  }
}
metadata: {title},
});
return res.status(201).json({
success: true,
data: {_id: result.insertedId.toString(), ...doc},
});
res.setHeader("Allow", "GET,POST");
return res.status(405).json({success: false, error: "Method not allowed"});
}