import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireCronAuth} from "../../src/cronAuth.js";
import {getDb} from "../../src/db.js";
import {sendSubscriptionExpiringSoonEmail} from "../../src/email.js";

const REMINDER_DAYS = Number(process.env.SUBSCRIPTION_REMINDER_DAYS ?? 3);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const now = Date.now();
  const users = await db
    .collection("users")
    .find({
      "subscription.tier": "premium",
      "subscription.premium.isLifetime": {$ne: true},
      "subscription.premium.endDate": {$ne: null},
    })
    .toArray();

  let notified = 0;
  for (const user of users) {
    const endDate = user.subscription?.premium?.endDate;
    if (!endDate) continue;
    const days = Math.ceil((new Date(endDate).getTime() - now) / 86_400_000);
    if (days !== REMINDER_DAYS) continue;

    const lastSent = user.subscription?.premium?.reminderSentAt;
    if (lastSent) continue;

    if (user.email) {
      await sendSubscriptionExpiringSoonEmail(user.email, {
        daysRemaining: days,
        endDate,
      }).catch(() => undefined);
      await db.collection("users").updateOne(
        {_id: user._id},
        {$set: {"subscription.premium.reminderSentAt": new Date().toISOString()}},
      );
      notified += 1;
    }
  }

  return res.status(200).json({success: true, data: {checked: users.length, notified}});
}