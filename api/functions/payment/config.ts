import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {getPaymentConfig, sanitizePublicConfig} from "../../src/paymentConfig.js";
import {currentSubscriptionSummary, ensureSubscriptionCurrent} from "../../src/subscription.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();
  const [config, sub] = await Promise.all([
    getPaymentConfig(db),
    ensureSubscriptionCurrent(db, user._id),
  ]);

  const publicConfig = sanitizePublicConfig(config);
  const userSubscription = currentSubscriptionSummary(sub, config.plans);

  return res.status(200).json({
    success: true,
    data: {
      publicConfig,
      userSubscription,
      promoCodeEnabled: true,
    },
  });
}