/**
 * POST /api/gamification/dismiss-notifications
 *
 * Clears the user's pending-achievement-notification queue after the client
 * has displayed celebration UI for them.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();

  const ids = Array.isArray((req.body as { ids?: unknown })?.ids)
    ? (req.body as { ids: unknown[] }).ids.filter((x): x is string => typeof x === "string")
    : null;

  const update =
    ids && ids.length > 0
      ? { $pullAll: { "gamification.achievements.pendingNotification": ids } }
      : { $set: { "gamification.achievements.pendingNotification": [] } };

  await db.collection("users").updateOne({ _id: user._id }, update);

  return res.status(200).json({ success: true });
}
