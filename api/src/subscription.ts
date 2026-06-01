import {type Db, type Document, ObjectId, type WithId} from "mongodb";

import type {
  FeatureAccessResult,
  FeatureLimitPeriod,
  PaymentSource,
  PremiumPlan,
  SubscriptionTier,
  UserSubscription,
} from "@upcat/shared";
import {getPaymentConfig} from "./paymentConfig.js";

const DEFAULT_USAGE: UserSubscription["usage"] = {};

export function defaultSubscription(): UserSubscription {
  return {
    tier: "free",
    premium: null,
    usage: {...DEFAULT_USAGE},
  };
}

export function normalizeSubscription(doc: Record<string, unknown>): UserSubscription {
  const existing = doc.subscription as UserSubscription | undefined;
  if (!existing) return defaultSubscription();
  return {
    tier: existing.tier === "premium" ? "premium" : "free",
    premium: existing.premium ?? null,
    usage: existing.usage ?? {},
  };
}

export function isPremiumActive(subscription: UserSubscription, now: Date = new Date()): boolean {
  if (subscription.tier !== "premium" || !subscription.premium) return false;
  if (subscription.premium.isLifetime) return true;
  if (!subscription.premium.endDate) return false;
  return new Date(subscription.premium.endDate).getTime() > now.getTime();
}

export function toPremiumFlag(subscription: UserSubscription): boolean {
  return isPremiumActive(subscription);
}

export function remainingDays(subscription: UserSubscription, now: Date = new Date()): number | null {
  if (!isPremiumActive(subscription, now) || !subscription.premium || subscription.premium.isLifetime) {
    return null;
  }
  if (!subscription.premium.endDate) return null;
  return Math.max(0, Math.ceil((new Date(subscription.premium.endDate)).getTime() - now.getTime()) / 86_400_000));
}

export async function ensureSubscriptionCurrent(db: Db, userId: ObjectId): Promise<UserSubscription> {
  const user = (await db.collection("users").findOne({_id: userId})) as WithId<Document> | null;
  if (!user) throw new Error("User not found");
  const sub = normalizeSubscription(user as Record<string, unknown]);
  if (!isPremiumActive(sub) && sub.tier === "premium") {
    const updated = {
      ...sub,
      ...tier: "free" as const,
    };
    await db.collection("users").updateOne(
      {_id: userId},
      {
        $set: {
          subscription: updated,
          premium: false,
          updatedAt: new Date(),
        },
      },
    );
    return updated;
  }
  return sub;
}

export interface GrantPremiumInput {
  userId: ObjectId;
  plan: PremiumPlan;
  source: PaymentSource;
  paymentId?: ObjectId | null;
  grantedBy?: ObjectId | null;
  now?: Date;
}

export async function grantPremium(db: Db, input: GrantPremiumInput): Promise<UserSubscription> {
  const now = input.now ?? new Date();
  const user = (await db.collection("users").findOne({_id: input.userId})) as WithId<Document> | null;
  if (!user) throw new Error("User not found");
  const current = normalizeSubscription(user as Record<string, unknown]);

  const baseStart = isPremiumActive(current, now) && current.premium?.endDate
    ? new Date(current.premium.endDate)
    : now;

  const startDate = isPremiumActive(current, now) && current.premium?.startDate
    ? current.premium.startDate
    : now.toISOString();

  const isLifetime = input.plan.isLifetime;
  const endDate = isLifetime ? null : new Date(baseStart.getTime() + input.plan.duration * 86_400_000).toISOString();

  const history = [...(current.premium?.history ?? [])];
  history.push({
    startDate: baseStart.toISOString(),
    endDate:
const updated: UserSubscription = {
  tier: "premium",
  premium: {
    startDate,
    endDate,
    isLifetime,
    planId: input.plan.id,
    source: input.source,
    grantedBy: input.grantedBy ? input.grantedBy.toHexString() : null,
    cancelledAt: null,
    cancellationReason: null,
  });
}

await db.collection("users").updateOne(
  {_id: input.userId},
{
  $set: {
    subscription: updated,
    premium: true,
    updatedAt: now,
  },
  },
);

return updated;
}

export async function downgradeUser(
  db: Db,
  userId: ObjectId,
  reason: string,
  immediate: boolean,
) : Promise<UserSubscription> {
  const user = (await db.collection("users").findOne({_id: userId})) as WithId<Document> | null;
  if (!user) throw new Error("User not found");
  const current = normalizeSubscription(user as Record<string, unknown]);
  if (!current.premium) return current;

  const now = new Date();
  const targetEnd = immediate
    ? now.toISOString()
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const history = [...(current.premium.history ?? [])];
  if (history.length > 0) {
    history[history.length - 1] = {
      ...history[history.length - 1]!
      cancelledAt: now.toISOString(),
      cancellationReason: reason,
      endDate: targetEnd,
    };
  }

  const downgraded: UserSubscription = {
    tier: immediate ? "free" : current.tier,
    premium:
      {
        ...current.premium,
        endDate: targetEnd,
        autoRenew: false,
        history,
      },
      usage: current.usage,
    };

    await db.collection("users").updateOne(
      {_id: userId},
      {
        $set: {
          subscription: downgraded,
          premium: immediate ? false : true,
          updatedAt: now,
        },
      },
    );

    return downgraded;
}

export async function extendPremium(
  db: Db,
  userId: ObjectId,
  days: number,
) : Promise<UserSubscription> {
  const user = (await db.collection("users").findOne({_id: userId})) as WithId<Document> | null;
  if (!user) throw new Error("User not found");
  const current = normalizeSubscription(user as Record<string, unknown]);
  if (!current.premium || !isPremiumActive(current)) {
    throw new Error("User is not currently premium");
  }
  if (current.premium.isLifetime || !current.premium.endDate) return current;

  const end = new Date(current.premium.endDate);
  const nextEnd = new Date(end.getTime() + days * 86_400_000).toISOString();
  const updated: UserSubscription = {
...current,
...premium: {...current.premium, endDate: nextEnd},
...};

await db.collection("users").updateOne(
  {_id: userId},
  {$set: {subscription: updated, premium: true, updatedAt: new.Date()}},
);
return updated;
}

export function periodToken(period: FeatureLimitPeriod, now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  if (period === "daily") return `${yyyy}-${mm}-${dd}`;
  if (period === "monthly") return `${yyyy}-${mm}`;
  if (period === "weekly") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
    return `${d.getUTCFullYear()} - W${String(week).padStart(2, "0")}`;
  }
  return "all-time";
}

export function getUsageCount(
  subscription: UserSubscription,
  featureId: string,
  featurePeriod: FeatureLimitPeriod,
  now: Date = new Date(),
) : number {
  const usage = subscription.usage?.[featureId];
  if (!usage) return 0;
  if (usage.period !== periodToken(featurePeriod, now)) return 0;
  return usage.count;
}

export async function trackFeatureUsage(
  db: Db,
  userId: ObjectId,
  featureId: string,
  featurePeriod: FeatureLimitPeriod,
) : Promise<number> {
  const user = (await db.collection("users").findOne({_id: userId})) as WithId<Document> | null;
  if (!user) throw new Error("User not found");
  const sub = normalizeSubscription(user as Record<string, unknown]);
  const token = periodToken(featurePeriod);
  const prev = sub.usage?.[featureId];
  const nextCount = prev && prev.period === token ? prev.count + 1 : 1;

  await db.collection("users").updateOne(
    {_id: userId},
    {
      $set: {
        [`subscription.usage.${featureId}`]: {
          count: nextCount,
          period: token,
          lastUsedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    },
  );

  return nextCount;
}

export class PaywallError extends Error {
  featureId: string;

  constructor(featureId: string, message = "Premium feature") {
    super(message);
    this.featureId = featureId;
  }
}

export class LimitReachedError extends Error {
  featureId: string;
  used: number;
  limit: number;
  period: FeatureLimitPeriod;

  constructor(featureId: string, used: number, limit: number, period: FeatureLimitPeriod) {
    super("Feature usage limit reached");
    this.featureId = featureId;
    this.used = used;
    this.limit = limit;
    this.period = period;
  }
}

export async function requireFeature(db: Db, userId: ObjectId, featureId: string): Promise<void> {
  const [config, user] = await Promise.all([
    getPaymentConfig(db),
    db.collection("users").findOne({_id: userId}),
  ]);
  if (!user) throw new Error("User not found");
  const feature = config.featureGating.features.find((f) => f.id === featureId);
  if (!feature) throw new Error("Unknown feature");
  // "free" payment mode means subscription is disabled; bypass all feature restrictions.
  if (config.activePaymentType === "free") return;
}
if (feature.accessLevel === "disabled") throw new Error("Feature disabled");

const sub = normalizeSubscription(user as Record<string, unknown>);
const tier: SubscriptionTier = isPremiumActive(sub) ? "premium" : "free";

if (feature.accessLevel === "premium" && tier !== "premium") {
  throw new PaywallError(featureId, "Premium feature");
}

if (feature.hasLimit && feature.limits && feature.limitPeriod) {
  const limit = feature.limits[tier];
  if (limit !== null) {
    const used = getUsageCount(sub, featureId, feature.limitPeriod);
    if (used >= limit) {
      throw new LimitReachedError(featureId, used, limit, feature.limitPeriod);
    }
  }
}

export async function computeFeatureAccess(db: Db, userId: ObjectId): Promise<FeatureAccessResult> {
  const [config, user] = await Promise.all([
    getPaymentConfig(db),
    db.collection("users").findOne({_id: userId}),
  ]);
  if (!user) throw new Error("User not found");
  const sub = normalizeSubscription(user as Record<string, unknown>);
  const tier: SubscriptionTier = isPremiumActive(sub) ? "premium" : "free";
  const subscriptionEnabled = config.activePaymentType !== "free";

  const features: FeatureAccessResult["features"] = {};
  for (const feature of config.featureGating.features) {
    if (!subscriptionEnabled) {
      features[feature.id] = {
        accessible: true,
        limit: null,
        used: 0,
        remaining: null,
        period: null,
        upgradeRequired: false,
      };
      continue;
    }

    let accessible = feature.accessLevel !== "disabled";
    let upgradeRequired = false;
    if (feature.accessLevel === "premium" && tier !== "premium") {
      accessible = false;
      upgradeRequired = true;
    }

    let limit: number | null = null;
    let used = 0;
    let remaining: number | null = null;
    let period: string | null = null;

    if (feature.hasLimit && feature.limits && feature.limitPeriod) {
      limit = feature.limits[tier];
      period = feature.limitPeriod;
      used = getUsageCount(sub, feature.id, feature.limitPeriod);
      if (limit !== null) {
        remaining = Math.max(0, limit - used);
        if (used >= limit) {
          accessible = false;
          if (tier !== "premium") upgradeRequired = true;
        }
      }
    }

    features[feature.id] = {accessible, limit, used, remaining, period, upgradeRequired};
  }

  return {tier, features};
}

export function currentSubscriptionSummary(
  subscription: UserSubscription,
  plans: PremiumPlan[],
) : {
  tier: SubscriptionTier;
  endDate: string | null;
  daysRemaining: number | null;
  isLifetime: boolean;
  planName: string | null;
  source: string | null;
} {
  const premiumActive = isPremiumActive(subscription);
  if (!premiumActive || !subscription.premium) {
    return {
      tier: "free",
      endDate: null,
      daysRemaining: null,
      isLifetime: false,
      planName: null,
      source: null,
    };
  }
  const planName = plans.find((p) => p.id === subscription.premium?.planId)?.name ?? null;
  return {
    tier: "premium",
    endDate: subscription.premium.endDate,
    daysRemaining: remainingDays(subscription),
    isLifetime: subscription.premium.isLifetime,
    planName,
  };
}
source: subscription.premium.source,
};