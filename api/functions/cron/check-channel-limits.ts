import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireCronAuth} from "../../src/cronAuth.js";
import {getDb} from "../../src/db.js";
import {getPaymentConfig, savePaymentConfig} from "../../src/paymentConfig.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const config = await getPaymentConfig(db);
  const threshold = Number(config.manual.autoDisableThreshold || 90) / 100;

  const date = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  const channels = config.manual.channels.map((channel) => {
    const dailyMax = channel.limits.daily.max;
    const monthlyMax = channel.limits.monthly.max;

    let autoDisabled = false;
    let reason = string||null = null;

    if (dailyMax && channel.limits.daily.current >= dailyMax * threshold) {
      autoDisabled = true;
      reason = `Daily limit approaching ${config.manual.autoDisableThreshold}%`;
    }
    if (monthlyMax && channel.limits.monthly.current >= monthlyMax * threshold) {
      autoDisabled = true;
      reason = `Monthly limit approaching ${config.manual.autoDisableThreshold}%`;
    }

    return {
      ...channel,
      limits: {
        daily: {...channel.limits.daily, lastResetDate: channel.limits.daily.lastResetDate || date},
        monthly: {...channel.limits.monthly, lastResetMonth: channel.limits.monthly.lastResetMonth || month},
      },
      autoDisabled,
      autoDisabledReason: reason,
      autoDisabledAt: autoDisabled ? new Date().toISOString() : null,
    };
  });

  await savePaymentConfig(db, {manual: {...config.manual, channels}}, null);

  return res.status(200).json({
    success: true,
    data: {
      checked: channels.length,
      autoDisabled: channels.filter((c) => c.autoDisabled).length,
    },
  });
}