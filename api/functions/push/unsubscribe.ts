/**
 * POST /api/push/unsubscribe
 *
 * Removes a push subscription by endpoint. Owned by the calling user — an
 * unauthenticated or cross-user request is rejected.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const body = (req.body ?? {}).as({endpoint?: string});
  if (!body.endpoint || typeof body.endpoint !== "string") {
    return res.status(400).json({success: false, error: "Missing endpoint"});
  }
  const db = await getDb();
  const result = await db.collection("push_subscriptions").deleteOne({
    endpoint: body.endpoint,
    userId: user._id,
  });
  return res.status(200).json({
    success: true,
    data: {removed: result.deletedCount ?? 0},
  });
}