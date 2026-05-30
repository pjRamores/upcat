import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {getPaymentConfig} from "../../src/paymentConfig.js";
import {
  computeFeatureAccess,
  LimitReachedError,
  PaywallError,
  periodToken,
  requireFeature,
  trackFeatureUsage,
} from "../../src/subscription.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();
  const url = String(req.url || "");

  if (req.method === "GET") {
    const data = await computeFeatureAccess(db, user._id);
    return res.status(200).json({success: true, data});
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET,POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const body = (req.body ?? {}).as({featureId?: string});
  const featureId = String(body.featureId || "").trim();
  if (!featureId) {
    return res.status(400).json({success: false, error: "featureId is required"});
  }

  const isTrack = url.includes("/track-usage") || String(req.query.action || "") === "track";
  const isCheck = url.includes("/check") || String(req.query.action || "") === "check" || !isTrack;

  if (isTrack) {
    const config = await getPaymentConfig(db);
    const feature = config.featureGating.features.find((f) => f.id === featureId);
    if (!feature || !feature.limitPeriod) {
      return res.status(200).json({success: true, data: {tracked: false, reason: "No usage period"}});
    }
    const count = await trackFeatureUsage(db, user._id, featureId, feature.limitPeriod);
    return res.status(200).json({
      success: true,
      data: {
        tracked: true,
        featureId,
        count,
        period: periodToken(feature.limitPeriod),
      },
    });
  }

  if (isCheck) {
    try {
      await requireFeature(db, user._id, featureId);
      return res.status(200).json({success: true, data: {allowed: true}});
    } catch (err) {
      if (err instanceof PaywallError) {
        return res.status(403).json({
          success: false,
          data: {
            allowed: false,
            reason: "This is a Premium feature.",
            featureId: err.featureId,
            upgradeUrl: "/pricing",
          },
        });
      }
      if (err instanceof LimitReachedError) {
        const periodPhrase =
          err.period === "daily"
          ? "today"
          : err.period === "weekly"
          ? "this week"
          : err.period === "monthly"
          ? "this month"
          : "in total";
        return res.status(429).json({
          success: false,
          data: {
            allowed: false,
            reason: "You've used ${err.used} of ${err.limit} ${featureId.replace(/_/g, " ")} ${periodPhrase}. Upgrade to Premium for higher limits.",
            featureId: err.featureId,
            used: err.used,
            limit: err.limit,
            period: err.period,
            upgradeUrl: "/pricing",
          },
        });
      }
      return res.status(400).json({
        success: false,
        data: {allowed: false, reason: (err as Error).message || "Feature check failed"},
      });
    }
  }

  return res.status(400).json({success: false, error: "Unknown feature action"});
}