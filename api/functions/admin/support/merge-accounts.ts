/**
 * POST /api/admin/support/merge-accounts
 * Combines secondary into primary, optionally folding exam sessions/contacts.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import {ObjectId} from "mongodb";
import type {AccountMergeStrategy, MergeAccountsResponse} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireAdmin} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {sendAccountMergedEmail} from "../../src/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const {primaryUserId, secondaryUserId, mergeStrategy, adminPassword} =
    (req.body??{}).as {
      primaryUserId?: string;
      secondaryUserId?: string;
      mergeStrategy?: AccountMergeStrategy;
      adminPassword?: string;
    };
    if (!primaryUserId || !secondaryUserId || primaryUserId === secondaryUserId) {
      return res
        .status(400)
        .json({success: false, error: "Two distinct user ids are required."});
    }
    if (!ObjectId.isValid(primaryUserId) || !ObjectId.isValid(secondaryUserId)) {
      return res.status(400).json({success: false, error: "Invalid user ids."});
    }
    if (mergeStrategy !== "keep_primary_data" && mergeStrategy !== "merge_all") {
      return res.status(400).json({success: false, error: "Invalid merge strategy."});
    }
    if (!adminPassword) {
      return res
        .status(400)
        .json({success: false, error: "Admin password is required."});
    }

    const db = await getDb();
    const adminDoc = await db.collection("users").findOne({_id: admin._id});
    const adminHash =
      (adminDoc?.auth?.passwordHash as string | undefined) ?? (
        (adminDoc?.passwordHash as string | undefined) ?? null;
      );
      if (!adminHash || !(await bcrypt.verify(adminPassword, adminHash))) {
        return res
        .status(401)
        .json({success: false, error: "Admin password is incorrect."});
      }

      const primaryId = new ObjectId(primaryUserId);
      const secondaryId = new ObjectId(secondaryUserId);
      const [primary, secondary] = await Promise.all([
        db.collection("users").findOne({_id: primaryId}),
        db.collection("users").findOne({_id: secondaryId}),
      ]);
      if (!primary || !secondary) {
        return res.status(404).json({success: false, error: "Both accounts must exist."});
      }
      if (secondary.role === "admin") {
        return res
        .status(400)
        .json({success: false, error: "Cannot merge an admin account away."});
      }

      const now = new Date();

      // 1) Identities — transfer; skip duplicates.
      const secondaryIdentities = await db
        .collection("user_identities")
        .find({userId: secondaryId})
        .toArray();
      let movedIdentities = 0;
      for (const ident of secondaryIdentities) {
        const dupe = await db
          .collection("user_identities")
          .findOne({userId: primaryId, provider: ident.provider});
        if (dupe) {
          // Primary already has this provider — drop secondary's record.
          await db.collection("user_identities").deleteOne({_id: ident._id});
        } else {
          await db.collection("user_identities").updateOne(
            {_id: ident._id},
            {$set: {userId: primaryId, mergedAt: now}},
          );
          movedIdentities += 1;
        }
      }

      // 2) Exam sessions — only if merge_all; otherwise leave secondary's data behind.
      let movedExamSessions = 0;
      if (mergeStrategy === "merge_all") {
        const r = await db
          .collection("exam_sessions")
          .updateMany({userId: secondaryId}, {$set: {userId: primaryId, mergedAt: now}});
        movedExamSessions = r.modifiedCount;
      }
    }
}
// 3) Contact messages — always transferred for traceability.
const cmr = await db
  .collection("contact_messages")
  .updateMany({userId: secondaryId}, {$set: {userId: primaryId, mergedAt: now}});
const movedContactMessages = cmr.modifiedCount;

// 4) Soft-delete secondary user (audit-friendly).
await db.collection("users").updateOne(
  {_id: secondaryId},
  {
    $set: {
      isActive: false,
      deactivatedAt: now,
      deactivatedBy: admin._id,
      notes: `Merged into ${primaryId.toString()} by ${admin.email}`,
      tokenInvalidatedAt: now,
      mergedInto: primaryId,
      updatedAt: now,
    },
  },
  );
await logActivity(db, {
  actorId: admin._id,
  actorRole: "admin",
  action: "user.merged",
  targetType: "user",
  targetId: primaryId,
  metadata: {
    primaryUserId: primaryId.toString(),
    secondaryUserId: secondaryId.toString(),
    mergeStrategy,
    movedIdentities,
    movedExamSessions,
    movedContactMessages,
    secondaryEmail: secondary.email,
  },
});
await Promise.all([
  sendAccountMergedEmail(primary.email, {keptEmail: primary.email}).catch(() => undefined),
  sendAccountMergedEmail(secondary.email, {keptEmail: primary.email}).catch(() => undefined),
]);

const response: MergeAccountsResponse = {
  merged: true,
  primaryUserId: primaryId.toString(),
  deletedUserId: secondaryId.toString(),
  movedIdentities,
  movedExamSessions,
  movedContactMessages,
};
return res.status(200).json({success: true, data: response});