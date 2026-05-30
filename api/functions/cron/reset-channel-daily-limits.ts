import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireCronAuth} from "../../src/cronAuth.js";
import {getDb} from "../../src/db.js";
import {getPaymentConfig, savePaymentConfig} from "../../src/paymentConfig.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const config = await getPaymentConfig(db);
  const today = new Date().toISOString().slice(0, 10);

  const channels = config.manual.channels.map((c) => ({
    ...c,
    limits: {
      ...c.limits,
      daily: {...c.limits.daily, current: 0, lastResetDate: today},
    },
    autoDisabled:
      c.autoDisabled && String(c.autoDisabledReason || "").toLowerCase().includes("daily")
    ..., false
    ..., c.autoDisabled,
    autoDisabledReason:
      c.autoDisabled && String(c.autoDisabledReason || "").toLowerCase().includes("daily")
    ..., null
    ..., c.autoDisabledReason,
    autoDisabledAt:
      c.autoDisabled && String(c.autoDisabledReason || "").toLowerCase().includes("daily")
    ..., null
    ..., c.autoDisabledAt,
  }));

  await savePaymentConfig(db, {manual: {...config.manual, channels}}, null);
  return res.status(200).json({success: true, data: {reset: channels.length}});
}