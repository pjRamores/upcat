import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {getPaymentConfig, savePaymentConfig} from "../../src/paymentConfig.js";
import {computeFeatureAccess} from "../../src/subscription.js";

function getFeatureId(req: VercelRequest): string | null {
  const id = req.query.featureId;
  if (!id) return null;
  return Array.isArray(id) ? (id[0] ?? null) : String(id);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();
  const url = String(req.url || "");
  const featureId = getFeatureId(req);

  if (req.method === "GET") {
    const config = await getPaymentConfig(db);
    const users = await db.collection("users").find({}).limit(500).toArray();

    const usageStats = new Map<string, {totalUsersHitting: number; avgUsage: number; count: number}}();
    for (const f of config.featureGating.features) {
      usageStats.set(f.id, {totalUsersHitting: 0, avgUsage: 0, count: 0});
    }

    for (const user of users) {
      const usage = (user.subscription?.usage ?? {}).asRecord<string, {count?: number}};
      for (const [key, value] of Object.entries(usage)) {
        const stat = usageStats.get(key);
        if (!stat) continue;
        const c = Number(value.count || 0);
        if (c > 0) stat.totalUsersHitting += 1;
        stat.avgUsage += c;
        stat.count += 1;
      }
    }

    const data = config.featureGating.features.map((f) => {
      const stat = usageStats.get(f.id)!
      return {
        ...f,
        usageStats: {
          totalUsersHitting: stat.totalUsersHitting,
          avgUsage: stat.count ? stat.avgUsage / stat.count : 0,
        },
      };
    });

    return res.status(200).json({success: true, data});
  }

  if (req.method !== "PUT" && req.method !== "POST") {
    res.setHeader("Allow", "GET,PUT,POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const body = (req.body ?? {}).as({
    accessLevel?: "all" | "premium" | "disabled",
    limits?: {free?: number | null; premium?: number | null},
    limitPeriod?: "daily" | "weekly" | "monthly" | "total" | null,
    features?: Array<
      id: string;
      accessLevel?: "all" | "premium" | "disabled";
      limits?: {free?: number | null; premium?: number | null};
      limitPeriod?: "daily" | "weekly" | "monthly" | "total" | null;
    >;
    userId?: string;
    tier?: "free" | "premium";
  });

  if (url.includes("/preview") || body.userId || body.tier) {
    if (body.userId) {
      const target = await db.collection("users").findOne({id: new (await import("mongodb")).ObjectId(body.userId)});
      if (!target) return res.status(404).json({success: false, error: "User not found"});
      const preview = await computeFeatureAccess(db, target._id);
      return res.status(200).json({success: true, data: preview});
    }

    const config = await getPaymentConfig(db);
    const tier = body.tier === "premium" ? "premium" : "free";
    const features: Record<string, unknown> = {};
    for (const feature of config.featureGating.features) {
      const limit = feature.limits ? feature.limits[tier] : null;
      const accessible = feature.accessLevel === "all" || (feature.accessLevel === "premium" && tier === "premium");
      features[feature.id] = {
        accessible: feature.accessLevel !== "disabled" && accessible,
        limit,
        used: 0,
        remaining: limit,
        period: feature.limitPeriod,
        upgradeRequired: feature.accessLevel === "premium" && tier === "free",
      };
    }
    return res.status(200).json({success: true, data: {tier, features}});
  }

  const config = await getPaymentConfig(db);

  if (url.includes("/bulk") || Array.isArray(body.features)) {
    const updates = body.features ?? [];
const next = config.featureGating.features.map((feature) => {
  const update = updates.find((u) => u.id === feature.id);
  if (!update) return feature;
  return {
    ...feature,
    accessLevel: update.accessLevel ?? feature.accessLevel,
    limits: update.limits
    ...? {
      free: update.limits.free ?? feature.limits?.free ?? null,
      premium: update.limits.premium ?? feature.limits?.premium ?? null,
    }
    : feature.limits,
    limitPeriod: update.limitPeriod ?? feature.limitPeriod,
  };
});

const saved = await savePaymentConfig(db, {featureGating: {features: next}}, admin._id);
return res.status(200).json({success: true, data: saved.featureGating.features});
}

if (!featureId) return res.status(400).json({success: false, error: "featureId is required"});
const target = config.featureGating.features.find((f) => f.id === featureId);
if (!target) return res.status(404).json({success: false, error: "Feature not found"});

const nextFeatures = config.featureGating.features.map((feature) => {
  feature.id === featureId
    ? {
      ...feature,
      accessLevel: body.accessLevel ?? feature.accessLevel,
      limits: body.limits
      ...? {
        free: body.limits.free ?? feature.limits?.free ?? null,
        premium: body.limits.premium ?? feature.limits?.premium ?? null,
      }
      : feature.limits,
      limitPeriod: body.limitPeriod ?? feature.limitPeriod,
    }
    : feature,
    );
}

const saved = await savePaymentConfig(db, {featureGating: {features: nextFeatures}}, admin._id);
const updated = saved.featureGating.features.find((f) => f.id === featureId);
return res.status(200).json({success: true, data: updated});
}