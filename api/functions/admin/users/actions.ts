/**
 * User account actions:
 * POST /api/admin/users/:id/deactivate
 * POST /api/admin/users/:id/reactivate
 * POST /api/admin/users/:id/reset-password
 * POST /api/admin/users/:id/verify-email
 *
 * The action is selected via the `?action=` query parameter so we can serve all four with one Vercel function file.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import crypto from "node:crypto";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {sendAccountStatusEmail, sendPasswordResetEmail} from "../../src/email.js";
import {RESET_TOKEN_EXPIRY_HOURS} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid user id"});
  }
  const oid = new ObjectId(id);
  const action = String(req.query.action ?? "");
  const db = await getDb();
  const users = db.collection("users");
  const user = await users.findOne({_id: oid});
  if (!user) return res.status(404).json({success: false, error: "User not found"});

  if (action === "deactivate") {
    if (oid.equals(admin._id)) {
      return res.status(400).json({success: false, error: "You cannot deactivate yourself."});
    }
    const now = new Date();
    await users.updateOne(
      {_id: oid},
      {
        $set: {
          isActive: false,
          deactivatedAt: now,
          deactivatedBy: admin._id,
          tokenInvalidatedAt: now,
          updatedAt: now,
        },
      },
    );
    sendAccountStatusEmail(user.email, "deactivated").catch(() => {
      });
    return res.status(200).json({success: true, data: {deactivated: true}});
  }

  if (action === "reactivate") {
    const now = new Date();
    await users.updateOne(
      {_id: oid},
      {
        $set: {isActive: true, updatedAt: now},
        $unset: {deactivatedAt: "", deactivatedBy: ""},
      },
    );
    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: "user.deactivated",
      targetType: "user",
      targetId: oid,
    });
    sendAccountStatusEmail(user.email, "reactivated").catch(() => {
      });
    return res.status(200).json({success: true, data: {reactivated: true}});
  }

  if (action === "reset-password") {
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    await users.updateOne(
      {_id: oid},
      {
        $set: {resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date()}},
      );
    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[admin.reset-password] email failed", err);
    }
    await logActivity(db, {
      actorId: admin._id,
      actorRole: "admin",
      action: "user.password_reset_initiated",
    });
  }
}
targetType: "user",
targetId: oid,
});
return res.status(200).json({success: true, data: {sent: true}});
}

if (action === "verify-email") {
await users.updateOne(
{_id: oid},
{
$set: {isVerified: true, verifiedAt: new Date(), updatedAt: new Date()},
$unset: {verificationToken: "", verificationTokenExpiry: ""},
},
);
await logActivity(db, {
actorId: admin._id,
actorRole: "admin",
action: "user.email_verified",
targetType: "user",
targetId: oid,
});
return res.status(200).json({success: true, data: {verified: true}});
}

return res.status(400).json({
success: false,
error: "Unknown action. Expected: deactivate | reactivate | reset-password | verify-email",
});
}