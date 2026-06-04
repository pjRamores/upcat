/**
 * POST: /api/auth/recover-account
 * Body: { action: "reset_password" | "set_password", newPassword, confirmNewPassword }
 *
 * Requires a recovery JWT (Authorization: Bearer ...) issued by one of the
 * recovery verify endpoints. Sets a password and clears any account lock.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as bcrypt from "node-rs/bcrypt";
import { ObjectId } from "mongodb";
import { validatePassword } from "@upcat/shared";
import { getDb } from "../../src/db.js";
import { verifyRecoveryToken } from "../../../../src/recovery.js";
import { logActivity } from "../../../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const authHeader = (req.headers.authorization ?? "").toString();
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing recovery token." });
  }
  let claims;
  try {
    claims = verifyRecoveryToken(authHeader.slice(7));
  } catch {
    return res
      .status(401)
      .json({ success: false, error: "Recovery token is invalid or expired." });
  }

  const { action, newPassword, confirmNewPassword } = (req.body ?? {}) as {
    action?: "reset_password" | "set_password";
    newPassword?: string;
    confirmNewPassword?: string;
  };
  if (action !== "reset_password" && action !== "set_password") {
    return res.status(400).json({ success: false, error: "Invalid action." });
  }
  if (!newPassword || !confirmNewPassword || newPassword !== confirmNewPassword) {
    return res
      .status(400)
      .json({ success: false, error: "Passwords do not match." });
  }
  const check = validatePassword(newPassword);
  if (!check.isValid) {
    return res.status(400).json({
      success: false,
      error: `Password requirements not met: ${check.errors.join(", ")}`,
    });
  }

  const db = await getDb();
  const userId = new ObjectId(claims.userId);
  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) {
    return res.status(404).json({ success: false, error: "Account not found." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date();
  await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        passwordHash,
        "auth.passwordHash": passwordHash,
        "auth.hasPassword": true,
        "security.lastPasswordChangeAt": now,
        "security.loginAttempts.count": 0,
        "security.loginAttempts.lockedUntil": null,
        tokenInvalidatedat: now,
        updatedAt: now,
      },
    }
  );

  await logActivity(db, {
    actorId: userId,
    actorRole: "system",
    action: "auth.account_recovered",
    targetType: "user",
    targetId: userId,
    metadata: { action },
  });

  return res.status(200).json({
    success: true,
    data: { success: true, message: "Password set. You can now log in." },
  });
}