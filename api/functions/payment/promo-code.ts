import type {VercelRequest, VercelResponse} from "@vercel/node";
import {RATE_WINDOWS} from "@upcat/shared";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {redeemPromoCode, validatePromoCode} from "../../src/payments.js";
import {checkAndIncrement} from "../../src/security/rateLimit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const db = await getDb();
  const code = String((req.body ?? {}).code || "");
  const path = String(req.url || "");

  const isRedeem = path.includes("/redeem") || String(req.query.action || "") === "redeem";

  const limit = await checkAndIncrement({
    scope: "user",
    identifier: user._id.toHexString(),
    endpoint: isRedeem ? "POST/api/payment/promo-code/redeem" : "POST/api/payment/promo-code/validate",
    limit: isRedeem ? 5 : 10,
    windowMs: isRedeem ? RATE_WINDOWS.perDay : RATE_WINDOWS.perHour,
  });
  if (limit.limited) {
    return res.status(429).json({success: false, error: "Too many promo-code attempts"});
  }

  if (isRedeem) {
    const redeemed = await redeemPromoCode(db, user._id, code);
    if (!redeemed.redeemed) {
      return res.status(400).json({
        success: false,
        data: {redeemed: false, reason: redeemed.reason ?? "Invalid code"},
      });
    }
    return res.status(200).json({success: true, data: redeemed});
  }

  const result = await validatePromoCode(db, user._id, code);
  if (!result.valid || !result.promo) {
    return res.status(200).json({
      success: true,
      data: {valid: false, reason: result.reason ?? "Invalid code"},
    });
  }

  const promo = result.promo;
  return res.status(200).json({
    success: true,
    data: {
      valid: true,
      type: promo.type,
      grant: {
        description:
          promo.type === "discount"
          ? `Discount code ${promo.grant.discountPercent ?? 0}% off``
          : promo.type === "extended_trial"
          ? `Extended trial ${promo.grant.durationDays ?? 0} days``
          : "Premium-grant",
          discountPercent: promo.grant.discountPercent,
          durationDays: promo.grant.durationDays,
        },
      },
    });
  }
}