import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import type { StudyPlanTemplate } from "@upcat/shared";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { normalizeLesson } from "../../src/studyPlan.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();
  const action = typeof req.query.action === "string" ? req.query.action : "";
  const id = typeof req.query.id === "string" ? req.query.id : null;

  try {
    if (action === "templates") {
      if (req.method === "GET" && !id) {
        const templates = await db.collection("study_plan_templates").find({}).sort({ createdAt: -1 }).toArray();
        const data = await Promise.all(
          templates.map(async (t) => ({
            ...t,
            id: String(t._id),
            activePlansUsingIt: await db.collection("study_plans").countDocuments({
              "meta.templateId": String(t._id),
              status: "active"
            }),
          }))
        );
        return res.status(200).json({ success: true, data });
      }

      if (req.method === "POST" && !id) {
        const body = (req.body ?? {}) as Partial<StudyPlanTemplate>;
        if (!body.name || !body.structure?.phases?.length) {
          return res.status(400).json({ success: false, error: "name and structure.phases are required" });
        }
        const { _id: _ignoredId, ...payload } = body;
        const now = new Date().toISOString();
        const insert = await db.collection("study_plan_templates").insertOne({
          ...payload,
          status: body.status ?? "draft",
          createdBy: admin._id.toString(),
          createdAt: now,
          updatedAt: now,
        });
        return res.status(201).json({ success: true, data: { id: insert.insertedId.toString() } });
      }

      if (req.method === "PUT" && id) {
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, error: "Invalid template id" });
        }
        const body = (req.body ?? {}) as Record<string, unknown>;
        await db.collection("study_plan_templates").updateOne(
          { _id: new ObjectId(id) },
          {$set: {...body, updatedAt: new Date().toISOString()}}
        );
        return res.status(200).json({ success: true, data: { updated: true } });
      }

      res.setHeader("Allow", "GET, POST, PUT");
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    if (action === "lessons") {
      if (req.method === "GET" && !id) {
        const filters: Record<string, unknown> = {};
        if (typeof req.query.subjectArea === "string") filters.subjectArea = req.query.subjectArea;
        if (typeof req.query.subtopic === "string") filters.subtopic = req.query.subtopic;
        if (typeof req.query.status === "string") filters.status = req.query.status;

        const lessons = await db.collection("study_lessons").find(filters).sort({ updatedAt: -1 }).toArray();
        return res.status(200).json({ success: true, data: lessons.map(normalizeLesson) });
      }

      if (req.method === "POST" && !id) {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.title || !body.subjectArea || !body.subtopic) {
          return res.status(400).json({
            success: false,
            error: "title, subjectArea, and subtopic are required"
          });
        }
        const now = new Date().toISOString();
        const insert = await db.collection("study_lessons").insertOne({
          ...body,
          status: body.status ?? "draft",
          createdBy: admin._id,
          createdAt: now,
          updatedAt: now,
        });
        return res.status(201).json({ success: true, data: { id: insert.insertedId.toString() } });
      }

      if (req.method === "PUT" && id) {
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, error: "Invalid lesson id" });
        }
        const body = (req.body ?? {}) as Record<string, unknown>;
        await db.collection("study_lessons").updateOne(
          { _id: new ObjectId(id) },
$set: {
    ...body,
    updatedAt: new Date().toISOString(),
  },
});

return res.status(200).json({ success: true, data: { updated: true }});
}

res.setHeader("Allow", "GET, POST, PUT");
return res.status(405).json({ success: false, error: "Method not allowed"});

if (action === "analytics" && req.method === "GET") {
  const [totalActivePlans, totalCompletedPlans, totalAbandonedPlans] = await Promise.all([
    db.collection("study_plans").countDocuments({ status: "active" }),
    db.collection("study_plans").countDocuments({ status: "completed" }),
    db.collection("study_plans").countDocuments({ status: "abandoned" }),
  ]);

  const totalPlans = await db.collection("study_plans").countDocuments({});
  const averageCompletionRate = totalPlans
    ? Math.round((totalCompletedPlans / totalPlans) * 100)
    : 0;

  const failedModules = await db.collection("study_plan_assessments").aggregate([
    { $match: { "score.passed": false, status: "completed" } },
    { $group: { _id: "$moduleId", fails: {$sum: 1}, avgScore: {$avg: "$score.percentage"} } },
    { $sort: { fails: -1 } },
    { $limit: 10 },
  ]).toArray();

  return res.status(200).json({
    success: true,
    data: {
      totalActivePlans,
      totalCompletedPlans,
      totalAbandonedPlans,
      averageCompletionRate,
      averageAssessmentPassRate: 0,
      mostDifficultModules: failedModules,
      averagePlanDuration: 0,
      dropOffPoints: [],
    },
  });
}

if (action === "users" && req.method === "GET") {
  const plans = await db.collection("study_plans").find({ status: {$in: ["active", "paused"]} }).toArray();
  const userIds = [...new Set(plans.map((p) => String(p.userId)))].filter((id) => ObjectId.isValid(id));
  const users = await db.collection("users").find({_id: {$in: userIds.map((id) => new ObjectId(id))}}).project({
    firstName: 1,
    lastName: 1,
    email: 1
  }).toArray();
  const byUser = new Map(users.map((u) => [String(u._id), u]));

  return res.status(200).json({
    success: true,
    data: plans.map((plan) => ({
      userId: String(plan.userId),
      user: byUser.get(String(plan.userId)) ?? null,
      planId: String(plan._id),
      status: plan.status,
      progress: plan.progress,
    })),
  });

  res.setHeader("Allow", "GET, POST, PUT");
  return res.status(405).json({ success: false, error: "Method not allowed" });
} catch (error) {
  console.error("[study-plan/admin] failed", error);
  return res.status(500).json({ success: false, error: "Internal server error" });
}