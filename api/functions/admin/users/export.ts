/**
 * GET/api/admin/users/export
 * Streams a CSV of users matching the same filters as the list view.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();
  const search = (req.query.search as string) || undefined?.trim();
  const role = req.query.role as string || undefined;
  const isActive = req.query.isActive;
  const isVerified = req.query.isVerified;

  const match: Record<string, unknown> = {};
  if (role && (role === "admin" || role === "reviewee")) match.role = role;
  if (isActive === "true") match.isActive = true;
  if (isActive === "false") match.isActive = false;
  if (isVerified === "true") match.isVerified = true;
  if (isVerified === "false") match.isVerified = false;
  if (search) {
    const r = new RegExp(search.replace(/[.*+?^${()}|[$]\$$]/g, "\\$&"), "i");
    match.$or = [{email: r}, {firstName: r}, {lastName: r}];
  }

  const users = await db
    .collection("users")
    .aggregate([
      {$match: match},
    ],
    {
      $lookup: {
        from: "exam_sessions",
        let: {uid: "$_id"},
        pipeline: [
          {$match: {$expr: {$eq: ["$userId", "$uid"]}, status: "completed"}},
          {$group: {_id: null, n: {$sum: 1}, avg: {$avg: "$score.percentage"}}},
        ],
        as: "stats",
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        isActive: 1,
        isVerified: 1,
        createdAt: 1,
        lastLoginAt: 1,
        examCount: {$ifNull: [{$arrayElemAt: ["$stats.n", 0}], 0}],
        averageScore: {$arrayElemAt: ["$stats.avg", 0]},
      },
    },
  ],
  ])
  .toArray();

  const headers = [
    "id",
    "firstName",
    "lastName",
    "email",
    "role",
    "isActive",
    "isVerified",
    "createdAt",
    "lastLoginAt",
    "examCount",
    "averageScore",
  ];

  const rows = users.map((u) => [
    u._id.toString(),
    u.firstName ?? "",
    u.lastName ?? "",
    u.email ?? "",
    u.role ?? "reviewee",
    String(u.isActive ?? true),
    String(u.isVerified ?? false),
    u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt ?? ""),
    u.lastLoginAt instanceof Date ? u.lastLoginAt.toISOString() : String(u.lastLoginAt ?? ""),
    String(u.examCount ?? 0),
    typeof u.averageScore === "number" ? String(Math.round(u.averageScore * 10) / 10) : "",
  ]);

  const csv = [headers, ...rows]
  .map((row) => row.map(csvCell).join(","))
  .join("\n");

  await logActivity(db, {
    actorId: admin._id,
    actorRole: "admin",
    action: "user.exported",
    targetType: "user",
    targetId: null,
    metadata: {count: rows.length},
  });
res.setHeader("Content-Type", "text/csv; charset=utf-8");
res.setHeader("Content-Disposition", `attachment; filename="users-${Date.now()}.csv"`);
return res.status(200).send(csv);
}

function csvCell(value: string): string {
  const needsQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '"'');
  return needsQuote ? `${escaped}` : escaped;
}