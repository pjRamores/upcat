import type {VercelRequest, VercelResponse} from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import {getDb} from "../../src/db.js";
import {validatePassword} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const {token, newPassword, confirmNewPassword} = req.body??{};

  if (!token || typeof token !== "string") {
    return res.status(400).json({success: false, error: "Reset token is required."});
  }

  if (!newPassword || !confirmNewPassword) {
    return res.status(400).json({success: false, error: "All fields are required."});
  }

  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.isValid) {
    return res.status(400).json({
      success: false,
      error: `Password requirements not met: ${pwCheck.errors.join(", ")}.`,
    });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({success: false, error: "Passwords do not match."});
  }

  const db = await getDb();
  const users = db.collection("users");

  const user = await users.findOne({
    resetToken: token,
    resetTokenExpiry: {$gt: new Date()},
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      error: "Invalid or expired reset token.",
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await users.updateOne({
    _id: user._id},
    {
      $set: {
        passwordHash,
        "auth.passwordHash": passwordHash,
        "auth.hasPassword": true,
        updatedAt: new Date(),
      },
      $unset: {resetToken: "", resetTokenExpiry: ""},
    },
  });

  return res.status(200).json({
    success: true,
    data: {message: "Password reset successfully."},
  });
}