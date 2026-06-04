/**
 * GET /api/gamification/achievements - list every achievement w/ progress.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { listUserAchievements } from "../../../../src/achievements.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();
  const items = await listUserAchievements(db, user);
  return res.status(200).json({ success: true, data: items });
}