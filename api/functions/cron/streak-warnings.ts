/**
 * Cron: streak-warnings
 * Schedule: 19:00 UTC·daily·(`0·19·*•••`).
 *
 * Sends a "your streak is about to break!" push to users with an active streak (current > 0) who haven't logged study activity today. Honours preferences streak alert.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import type {ObjectId} from "mongodb";
import {requireCronAuth} from "../../src/cronAuth.js";
import {getDb} from "../../src/db.js";
import {sendPushTo} from "../../src/push.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const todayUtc = new Date().toISOString().slice(0, 10);

  // Users with a live streak (>0) and not-yet-active today.
  const atRiskUsers = (await db.collection("users"))
    .find({
      isActive: {$ne: false},
      "gamification.streak.current": {$gt: 0},
      $or: [
        {"gamification.streak.lastActiveDate": {$lt: todayUtc}},
        {"gamification.streak.lastActiveDate": null},
        {"gamification.streak.lastActiveDate": {$exists: false}},
      ],
    })
    .project({_id: 1, "gamification.streak.current": 1})
    .toArray() as Array<{_id: ObjectId; gamification?: {streak?: {current?: number}}}>;

  if (atRiskUsers.length === 0) {
    return res.status(200).json({
      success: true,
      data: {candidates: 0, attempted: 0, delivered: 0},
    });
  }

  const streakByUser = new Map(
    atRiskUsers.map((u) => [u._id.toString(), u.gamification?.streak?.current ?? 0]),
  );

  const subs = (await db
    .collection("push_subscriptions")
    .find({
      userId: {$in: atRiskUsers.map((u) => u._id)},
      "preferences.streak_alert": true,
    })
    .toArray() as unknown as Array<
      _id: ObjectId;
      userId: ObjectId;
      endpoint: string;
      keys: {p256dh: string; auth: string};
    })>;

  const results = await Promise.all(
    subs.map((s) => {
      const streak = streakByUser.get(s.userId.toString()) ?? 0;
      return sendPushTo(db, s, {
        title: `Your ${streak}-day streak is on the line!`,
        body: "A quick session today keeps your streak alive.",
        type: "streak_alert",
        url: "/practice",
        data: {streak},
      });
    }),
  );

  return res.status(200).json({
    success: true,
    data: {
      candidates: atRiskUsers.length,
      attempted: results.length,
      delivered: results.filter((r) => r.ok).length,
      pruned: results.filter((r) => r.pruned).length,
    },
  });
}