/**
 * Admin user management - list (GET) & create (POST).
 * GET /api/admin/users
 * POST /api/admin/users/create
 *
 * The create flow lives in this file as well so we can reuse the
 * email/uniqueness/role validation. The router exposes both verbs
 * via separate Vercel rewrites.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import crypto from "node:crypto";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {sendPasswordResetEmail} from "../../src/email.js";
import {RESET_TOKEN_EXPIRY_HOURS, validateEmail} from "@upcat/shared";

const SORT_FIELDS = new Set(["createdAt", "lastLoginAt", "examCount", "averageScore", "email"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const db = await getDb();
  const action = String(req.query.action ?? "");

  if (req.method === "POST" && action === "create") return createUser(req, res, admin._id, db);
  if (req.method === "GET") return listUsers(req, res, db);

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({success: false, error: "Method not allowed"});
}

async function listUsers(
  req: VercelRequest,
  res: VercelResponse,
  db: Awaited<ReturnType<typeof getDb>>,
) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
  const search = (req.query.search as string) || undefined?.trim();
  const role = req.query.role as string | undefined;
  const isActive = req.query.isActive;
  const isVerified = req.query.isVerified;
  const sortBy = SORT_FIELDS.has(String(req.query.sortBy)) ? String(req.query.sortBy) : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const match: Record<string, unknown> = {};
  if (role && (role === "admin" || role === "reviewee")) match.role = role;
  if (isActive === "true") match.isActive = true;
  if (isActive === "false") match.isActive = false;
  if (isVerified === "true") match.isVerified = true;
  if (isVerified === "false") match.isVerified = false;
  if (search) {
    const r = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{email: r}, {firstName: r}, {lastName: r}];
  }

  const aggregateBase = [
    {$match: match},
    {
      $lookup: {
        from: "exam_sessions",
        let: {uid: "$_id"},
        pipeline: [
          {$match: {$expr: {$eq: ["$userId", "$$uid"]}, status: "completed"}},
          {
            $group: {
              _id: null,
              examCount: {$sum: 1},
              averageScore: {$avg: "$score.percentage"},
              lastExamDate: {$max: "$completedAt"},
            },
          },
        ],
        as: "stats",
      },
    },
    {
      $addFields: {
        examCount: {$ifNull: [{$arrayElemAt: ["$stats.examCount", 0}]}, 0]},
        averageScore: {$arrayElemAt: ["$stats.averageScore", 0]},
        lastExamDate: {$arrayElemAt: ["$stats.lastExamDate", 0]},
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
        examCount: 1,
        averageScore: 1,
        lastExamDate: 1,
      },
    },
  ];
}

const sortStage = {$sort: [{sortBy]: sortOrder} as Record<string, 1 | -1>};
const [items, totalArr] = await Promise.all([
  db
  .collection("users")
  .aggregate([
    ...aggregateBase,
    ...sortStage,
    ...{$skip: (page - 1) * limit},
    ...{$limit: limit},
  ])
  .toArray(),
  db.collection("users").aggregate([{$match: match}, {$count: "n"}]).toArray(),
]);

const total = (totalArr[0]) as {n?: number} | undefined? .n?? 0;

return res.status(200).json({
  success: true,
  data: {
    items: items.map((u) => ({
      _id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role ?? "reviwee",
      isActive: u.isActive ?? true,
      isVerified: u.isVerified ?? false,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt ?? null,
      examCount: u.examCount ?? 0,
      averageScore: typeof u.averageScore === "number" ? Math.round(u.averageScore * 10) / 10 : null,
      lastExamDate: u.lastExamDate ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }),
});

async function createUser(
  req: VercelRequest,
  res: VercelResponse,
  adminId: ObjectId,
  db: Awaited<ReturnType<typeof getDb>>,
) {
  const body = req.body ?? {};
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "reviwee";
  const sendInvite = Boolean(body.sendInviteEmail);

  if (!firstName || !lastName || !email) {
    return res.status(400).json({success: false, error: "firstName, lastName, email are required"});
  }
  if (!validateEmail(email)) {
    return res.status(400).json({success: false, error: "Invalid email"});
  }

  const users = db.collection("users");
  const existing = await users.findOne({email});
  if (existing) {
    return res.status(409).json({success: false, error: "A user with this email already exists."});
  }

  // Generate a random password the user must reset on first login.
  const tempPassword = crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const now = new Date();

  const insert = await users.insertOne({
    firstName,
    lastName,
    email,
    passwordHash,
    role,
    isActive: true,
    isVerified: true,
    loginCount: 0,
    lastLoginAt: null,
    deactivatedAt: null,
    deactivatedBy: null,
    notes: `Created by admin ${adminId.toString()}`,
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  });

  await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "user created",
    targetType: "user",
    targetId: insert.insertId,
    metadata: {email, role, sendInvite},
  });

  // Send a reset link so they can set their own password.
  if (sendInvite) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    await users.updateOne(
{_id: insert.insertedId},
{$set: {resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date()}},
try {
await sendPasswordResetEmail(email, token);
catch (err) {
// eslint-disable-next-line no-console
console.error("[admin.user.create] invite email failed", err);
}
return res.status(201).json({
success: true,
data: {_id: insert.insertedId.toString(), email, role, invited: sendInvite},
});