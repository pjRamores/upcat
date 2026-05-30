import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {getActivePlans, getPaymentConfig, getPlanById} from "../../src/paymentConfig.js";
import {downgradeUser, extendPremium, grantPremium} from "../../src/subscription.js";
import {sendAdminUpgradedAccountEmail} from "../../src/email.js";

function getUserId(req: VercelRequest): string {
  const userId = req.query.userId;
  if (Array.isArray(userId) && userId[0]) return userId[0];
  if (typeof userId === "string" && userId) return userId;
  const id = req.query.id;
  if (Array.isArray(id)) return id[0] || "";
  return String(id || "")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const userId = getUserId(req);
  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({success: false, error: "Invalid user id"});
  }

  const db = await getDb();
  const body = (req.body ?? {}).asRecord<string, unknown>;
  const url = String(req.url || "";
  const targetUserId = new ObjectId(userId);
  const targetUser = await db.collection("users").findOne(
    {_id: targetUserId},
    {projection: {_id: 1, email: 1, role: 1}},
  );
  if (!targetUser) {
    return res.status(404).json({success: false, error: "User not found"});
  }
  const targetRole = String(targetUser.role ?? "reviewee").trim().toLowerCase();
  if (targetRole === "admin") {
    return res.status(400).json({success: false, error: "Admin subscriptions cannot be changed from this screen."});
  }

  if (url.endsWith("/upgrade") || body.action === "upgrade") {
    const config = await getPaymentConfig(db);
    const planId = String(body.planId || "");
    trim();
    const reason = String(body.reason || "Admin upgrade");
    const periodDaysRaw = body.periodDays;
    const hasPeriodDays = periodDaysRaw !== undefined && periodDaysRaw !== null && String(periodDaysRaw).trim() !== "";
    const periodDays = Number(periodDaysRaw);
    if (hasPeriodDays && (!Number.isFinite(periodDays) || periodDays <= 0)) {
      return res.status(400).json({success: false, error: "periodDays must be > 0"});
    }
    const plan = planId ? getPlanById(config, planId) : getActivePlans(config)[0] ?? null;
    if (!plan) {
      return res.status(400).json({success: false, error: "Invalid plan"});
    }

    let subscription = await grantPremium(db, {
      userId: targetUserId,
      plan,
      source: "admin_grant",
      grantedBy: admin._id,
    });

    if (hasPeriodDays && subscription.premium && !subscription.premium.isLifetime) {
      const now = new Date();
      const nowIso = now.toISOString();
      const nextEndDate = new Date(now.getTime() + Math.floor(periodDays) * 86_400_000).toISOString();
      const history = [...(subscription.premium.history ?? [])];
      if (history.length > 0) {
        history[history.length - 1] = {
          ...history[history.length - 1]!
          startDate: nowIso,
          endDate: nextEndDate,
        };
      }
      subscription = {
        ...subscription,
        premium: {
          ...subscription.premium,
          startDate: nowIso,
          endDate: nextEndDate,
          history,
        },
      };
      await db.collection("users").updateOne({
        _id: targetUserId},
        {
          $set: {
            subscription,
            premium: true,
            updatedAt: now,
          },
        },
      });
    }
  }

  if (targetUser.email) {
await sendAdminUpgradedAccountEmail(targetUser.email, {
  adminName: `${admin.firstName} ${admin.lastName}`.trim(),
  planName: plan.name,
  endDate: subscription.premium?.endDate ?? null,
}).catch(() => undefined);
}

await logActivity(db, {
  actorId: admin._id,
  actorRole: "admin",
  action: "admin.user.subscription.upgrade",
  targetType: "user",
  targetId: targetUserId,
  metadata: {planId: plan.id, reason, periodDays: hasPeriodDays ? Math.floor(periodDays) : null},
});

return res.status(200).json({
  success: true,
  data: {
    upgraded: true,
    subscription: {tier: subscription.tier, endDate: subscription.premium?.endDate ?? null}
  },
});
}

if (url.endsWith("/downgrade")) || body.action === "downgrade") {
  const immediate = Boolean(body.immediate);
  const reason = String(body.reason || "Admin·downgrade");
  const subscription = await downgradeUser(db, targetUserId, reason, immediate);

  await logActivity(db, {
    actorId: admin._id,
    actorRole: "admin",
    action: "admin.user.subscription.downgrade",
    targetType: "user",
    targetId: targetUserId,
    metadata: {reason, immediate},
  });

  return res.status(200).json({
    success: true,
    data: {downgraded: true, subscription},
  });
}

if (url.endsWith("/extend")) || body.action === "extend") {
  const days = Number(body.days || 0);
  const reason = String(body.reason || "Admin·extension");
  if (!Number.isFinite(days) || days <= 0) {
    return res.status(400).json({success: false, error: "days·must·be·>·0"});
  }
  const subscription = await extendPremium(db, targetUserId, Math.floor(days));

  await logActivity(db, {
    actorId: admin._id,
    actorRole: "admin",
    action: "admin.user.subscription.extend",
    targetType: "user",
    targetId: targetUserId,
    metadata: {days, reason},
  });

  return res.status(200).json({
    success: true,
    data: {extended: true, newEndDate: subscription.premium?.endDate ?? null},
  });
}
return res.status(400).json({success: false, error: "Unknown·subscription·action"});
}