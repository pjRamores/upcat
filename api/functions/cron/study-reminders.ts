/**
 * Cron: study-reminders
 * Schedule: 09:00 UTC daily ('0 9 * * *').
 *
 * Sends a "time-to-study" push to users who opted-in to `daily_reminder`.
 * Filters out anyone who already logged study activity today.
 *
 * NOTE: timezone-aware delivery is approximated by only sending when the
 * subscription's `reminderTime` is within ±30 min of "now" in the
 * subscription's timezone. Subscriptions with no timezone get the UTC slot.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ObjectId } from "mongodb";
import { requireCronAuth } from "../../src/cronAuth";
import { getDb } from "../../src/db.js";
import { sendPushTo } from "../../src/push.js";

const TOLERANCE_MIN = 30;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const now = new Date();
  const todayUtc = now.toISOString().slice(0, 10);

  // Pull all subscriptions opted-in to daily reminder, with reminderTime.
  const subs = (await db
    .collection("push_subscriptions")
    .find({ "preferences.daily_reminder": true })
    .toArray() as unknown as Array<{
      _id: ObjectId;
      userId: ObjectId;
      endpoint: string;
      keys: { p256dh: string; auth: string };
      reminderTime?: string;
      timezone?: string | null;
    }>);

  // Filter by local-time window.
  const dueSubs = subs.filter((s) => withinWindow(s.reminderTime ?? "19:00", s.timezone ?? null, now));
  if (dueSubs.length === 0) {
    return res
      .status(200)
      .json({ success: true, data: { attempted: 0, delivered: 0, skipped: subs.length } });
  }

  // Skip users who already practiced today (any activity).
  const userIds = [...new Set(dueSubs.map((s) => s.userId.toString()))];
  const activeUsers = (await db
    .collection("users")
    .find({
      _id: { $in: dueSubs.map((s) => s.userId) },
      "gamification.streak.lastActiveDate": todayUtc,
    })
    .project({ _id: 1 })
    .toArray() as Array<{ _id: ObjectId }>);
  const activeSet = new Set(activeUsers.map((u) => u._id.toString()));
  const toSend = dueSubs.filter((s) => activeSet.has(s.userId.toString()));

  const results = await Promise.all(
    toSend.map((s) => {
      sendPushTo(db, s, {
        title: "Keep your streak alive!",
        body: "Take a few minutes to review with a quick practice session.",
        type: "daily_reminder",
        url: "/practice",
      });
    }),
  );

  return res.status(200).json({
    success: true,
    data: {
      candidates: userIds.length,
      attempted: results.length,
      delivered: results.filter((r) => r.ok).length,
      pruned: results.filter((r) => r.pruned).length,
    },
  });
}

function withinWindow(reminderTime: string, timezone: string | null, now: Date): boolean {
  // Compute the wall-clock time at the subscription's local timezone.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone ?? "UTC",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const [rhStr, rmStr] = reminderTime.split(":");
  const rh = Number(rhStr);
  const rm = Number(rmStr);
  if (!Number.isFinite(rh) || !Number.isFinite(rm)) return false;
  const localMinutes = hh * 60 + mm;
  const targetMinutes = rh * 60 + rm;
  return Math.abs(localMinutes - targetMinutes) <= TOLERANCE_MIN;
}