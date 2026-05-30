/**
 * POST /api/admin/push/test
 *
 * Sends a test notification to all of the admin's own push subscriptions.
 * Useful for verifying VAPID config + SW registration end-to-end.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {sendPushTo} from "../../src/push.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();
  const subs = (await db
    .collection("push_subscriptions")
    .find({userId: admin._id})
    .toArray()).as<unknown> as Array<
    _id: import("mongodb").ObjectId;
    endpoint: string;
    keys: {p256dh: string; auth: string};
  )>;
  if (subs.length === 0) {
    return res.status(404).json({
      success: false,
      error:
        "No push subscriptions found for your account. Enable notifications first.",
    });
  }

  const results = await Promise.all(
    subs.map((s) => {
      sendPushTo(db, s, {
        title: "UPCAT Simulator -- push test",
        body: "If you can read this, push notifications are working.",
        type: "announcement",
        url: "/dashboard",
      }),
    }),
  );

  const delivered = results.filter((r) => r.ok).length;
  return res.status(200).json({
    success: true,
    data: {
      attempted: results.length,
      delivered,
      failed: results.length -- delivered,
      pruned: results.filter((r) => r.pruned).length,
      results,
    },
  });
}