import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

function startForPeriod(period: string): Date {
  const now = new Date();
  if (period === "week") return new Date(now.getTime() - 6 * 86_400_000);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const period = String(req.query.period || "month");
  const start = startForPeriod(period);

  const db = await getDb();
  const [approved, users] = await Promise.all([
    db
    .collection("payment_submissions")
    .find({status: "approved", "review.reviewedAt": {$gte: start}})
    .toArray(),
    db.collection("users").find({}).toArray(),
  ]);

  const revenueTotal = approved.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const byPlan = new Map<string, number>();
  const byChannel = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const row of approved) {
    byPlan.set(String(row.planId), (byPlan.get(String(row.planId)) || 0) + Number(row.amount || 0));
    byChannel.set(String(row.channel), (byChannel.get(String(row.channel)) || 0) + Number(row.amount || 0));
    bySource.set("manual_payment", (bySource.get("manual_payment") || 0) + Number(row.amount || 0));
  }

  const now = Date.now();
  let active = 0;
  let expired = 0;
  let cancelled = 0;
  let lifetime = 0;
  for (const user of users) {
    const sub = user.subscription;
    if (!sub?.premium) continue;
    if (sub.premium.isLifetime) {
      active += 1;
      lifetime += 1;
      continue;
    }
    if (sub.premium.endDate && new Date(sub.premium.endDate).getTime() > now) active += 1;
    else expired += 1;
    const history = Array.isArray(sub.premium.history) ? sub.premium.history : [];
    if (history.some((h: {cancelledAt?: string | null }) => h.cancelledAt)) cancelled += 1;
  }

  const totalUsers = users.length;
  const premiumUsers = users.filter((u) => u.subscription?.tier === "premium").length;
  const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;
  const churnRate = premiumUsers > 0 ? (expired / Math.max(1, premiumUsers + expired)) * 100 : 0;

  const timelineMap = new Map<string, {
    date: string,
    revenue: number,
    newSubscribers: number,
    cancellations: number
  }>();
  for (const row of approved) {
    const date = new Date(row.review?.reviewedAt || row.createdAt).toISOString().slice(0, 10);
    const existing = timelineMap.get(date) || {date, revenue: 0, newSubscribers: 0, cancellations: 0};
    existing.revenue += Number(row.amount || 0);
    existing.newSubscribers += 1;
    timelineMap.set(date, existing);
  }

  return res.status(200).json({
    success: true,
    data: {
      revenue: {
        total: revenueTotal,
        byPlan: Array.from(byPlan, ([planId, total]) => ({planId, total})),
        byChannel: Array.from(byChannel, ([channelId, total]) => ({channelId, total})),
        bySource: Array.from(bySource, ([source, total]) => ({source, total})),
      },
      subscribers: {
        total: premiumUsers + expired,
        active,
        expired,
        cancelled,
        lifetime,
      },
      conversionRate,
      churnRate,
      timeline: Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    },
  });
}