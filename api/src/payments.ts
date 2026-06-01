import {type Db, type Document, ObjectId, type WithId} from "mongodb";
import type {PremiumPlan, PromoCode} from "@upcat/shared";
import {getPaymentConfig, getPlanById} from "./paymentConfig.js";
import {grantPremium, isPremiumActive, normalizeSubscription} from "./subscription.js";

export async function nextPaymentSubmissionNumber(db: Db): Promise<string> {
  const col = db.collection("counters");
  await col.updateOne(
    {_id: "payment_submission" as unknown as ObjectId},
    {$inc: {value: 1}},
    {upsert: true},
  );
  const doc = await col.findOne<{value?: number}>({
    _id: "payment_submission" as unknown as ObjectId,
  });
  const value = doc?.value ?? 1;
  return `PAY-${String(value).padStart(6, "0")}`;
}

export function cleanPromoCode(input: string): string {
  return String(input || "")
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9-]/g, "");
}

export interface PromoValidationResult {
  valid: boolean;
  reason: string | null;
  promo: WithId<PromoCode & Document> | null;
}

export async function validatePromoCode(
  db: Db,
  userId: ObjectId,
  codeRaw: string,
) : Promise<PromoValidationResult> {
  const code = cleanPromoCode(codeRaw);
  if (!code) return {valid: false, reason: "Invalid code", promo: null};

  const promo = (await db.collection("promo_codes").findOne({code})) as
    | WithId<PromoCode & Document>
    | null;
  if (!promo || !promo.isActive) return {valid: false, reason: "Invalid code", promo: null};

  const now = Date.now();
  if (promo.validFrom && new Date(promo.validFrom).getTime() > now) {
    return {valid: false, reason: "Code is not active yet", promo: null};
  }
  if (promo.validUntil && new Date(promo.validUntil).getTime() < now) {
    return {valid: false, reason: "Code expired", promo: null};
  }
  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    return {valid: false, reason: "Code usage limit reached", promo: null};
  }

  const userUses = (promo.usedBy ?? []).filter((u) => String(u.userId) === userId.toHexString()).length;
  if (userUses >= (promo.maxUsesPerUser ?? 1)) {
    return {valid: false, reason: "Code already used", promo: null};
  }

  if (promo.restrictToNewUsers) {
    const user = await db.collection("users").findOne({_id: userId});
    if (user) {
      const subscription = normalizeSubscription(user as Record<string, unknown>);
      if (subscription.premium?.history?.length) {
        return {valid: false, reason: "Code only for new users", promo: null};
      }
    }
    return {valid: true, reason: null, promo};
  }

  export function applyPromoDiscount(plan: PremiumPlan, promo: PromoCode | null): number {
    if (!promo || promo.type !== "discount") return plan.price;
    let amount = plan.price;
    if (promo.grant.discountPercent) {
      amount = amount * (1 - promo.grant.discountPercent / 100);
    }
    if (promo.grant.discountAmount) {
      amount = amount - promo.grant.discountAmount;
    }
    return Math.max(0, Math.round(amount));
  }

export async function recordPromoUse(
  db: Db,
  promoId: ObjectId | string,
  userId: ObjectId,
  submissionId: ObjectId | null,
) : Promise<void> {
  const normalizedPromoId = typeof promoId === "string" ? new ObjectId(promoId) : promoId;
  await db.collection("promo_codes").updateOne(
    {_id: normalizedPromoId},
    {
      $inc: {currentUses: 1},
      $push: {
        usedBy: {
          userId,
          usedAt: new Date().toISOString(),
          submissionId,
        },
      },
    },
  );
}
$set: {updatedAt: new Date().toISOString()},
} as never,
);
}

export async function redeemPromoCode(
db: Db,
userId: ObjectId,
codeRaw: string,
): Promise<{
  redeemed: boolean;
  result: {tier: "free" | "premium"; endDate: string | null} | null;
  reason?: string
}> {
  const check = await validatePromoCode(db, userId, codeRaw);
  if (!check.valid || !check.promo) {
    return {redeemed: false, result: null, reason: check.reason ?? "Invalid code"};
  }

  const promo = check.promo;
  if (promo.type === "discount") {
    return {redeemed: true, result: null};
  }

  const config = await getPaymentConfig(db);
  const defaultPlan = config.plans.find((p) => p.isActive) ?? config.plans[0];
  if (!defaultPlan) return {redeemed: false, result: null, reason: "No active plans configured"};

  let plan = defaultPlan;
  if (promo.grant.planId) {
    const matched = getPlanById(config, promo.grant.planId);
    if (matched) plan = matched;
  }

  if (promo.grant.durationDays && promo.grant.durationDays > 0) {
    plan = {
      ...plan,
      duration: promo.grant.durationDays,
      isLifetime: false,
      id: `${plan.id}_promo_${promo._id.toString()}$
    };
  }

  const updatedSub = await grantPremium(db, {
    userId,
    plan,
    source: "promo_code",
  });
  await recordPromoUse(db, promo._id, userId, null);

  return {
    redeemed: true,
    result: {
      tier: isPremiumActive(updatedSub) ? "premium" : "free",
      endDate: updatedSub.premium?.endDate ?? null,
    },
  };
}

export function computePlanPriceWithPromo(plan: PremiumPlan, promo: PromoCode | null): number {
  return applyPromoDiscount(plan, promo);
}