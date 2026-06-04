/**
 * POST /api/admin/users/:userId/unlock - clear loginAttempts.lockedUntil.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../../src/db.js";
import { requireAdmin } from "../../../../src/auth.js";
import { logActivity } from "../../../../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const idRaw = (req.query.userId ?? req.query.id ?? "").toString();
  if (!ObjectId.isValid(idRaw)) {
    return res.status(400).json({ success: false, error: "Invalid user id." });
  }
  const userId = new ObjectId(idRaw);
  const db = await getDb();
  const r = await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        "security.loginAttempts.count": 0,
        "security.loginAttempts.lockedUntil": null,
        updatedAt: new Date(),
      },
    }
  );
  if (r.matchedCount === 0) {
    return res.status(404).json({ success: false, error: "User not found." });
  }
  await logActivity(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "user.unlocked",
    targetType: "user",
    targetId: userId,
  });
  return res.status(200).json({ success: true, data: { unlocked: true } });
}