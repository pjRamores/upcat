import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireCronAuth} from "../../src/cronAuth.js";
import {getDb} from "../../src/db.js";
import {sendPushTo} from "../../src/push.js";

/**
 * Cron: study-plan-reminders
 * Sends daily reminders for users with an active study plan and upcoming sessions.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const plans = await db.collection("study_plans").find({status: "active"}).project({
    userId: 1,
    schedule: 1,
    curriculum: 1,
  }).toArray();

  const userIds = [...new Set(plans.map((p) => p.userId))];
  const subscriptions = await db.collection("push_subscriptions").find({
    userId: {$in: userIds},
    "preferences.daily_reminder": true,
  }).toArray();

  const planByUser = new Map(plans.map((plan) => [String(plan.userId), plan]));
  const sent = await Promise.all(
    subscriptions.map(async (sub) => {
      const plan = planByUser.get(String(sub.userId));
      if (!plan) return {ok: false, skipped: true};

      const allSessions = (plan.curriculum?.phases ?? [])
        .flatMap((phase: any) => (phase.modules ?? []).flatMap((mod: any) => mod.sessions ?? []));
      const next = allSessions.find(
        (session: any) =>
          (session.status === "available" || session.status === "in_progress") &&
          String(session.scheduledDate ?? "").slice(0, 10) <= today,
      );
      if (!next) return {ok: false, skipped: true};

      return sendPushTo(db, sub as any, {
        title: "Time to study!",
        body: `Today's topic: ${next.title}`,
        type: "daily_reminder",
        url: "/study_plan",
        data: {planId: String((plan as any)._id), sessionId: next.id},
      });
    });
  );

  return res.status(200).json({
    success: true,
    data: {
      plans: plans.length,
      subscriptions: subscriptions.length,
      delivered: sent.filter((r: any) => r?.ok).length,
    },
  });
}