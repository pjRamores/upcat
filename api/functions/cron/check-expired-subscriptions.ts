import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireCronAuth} from "../../src/cronAuth.js";
import {getDb} from "../../src/db.js";
import {sendSubscriptionExpiredEmail} from "../../src/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const now = new Date();

  const users = await db
    .collection("users")
    .find({
      "subscription.tier": "premium",
      "subscription.premium.isLifetime": {$ne: true},
      "subscription.premium.endDate": {$lte: now.toISOString()},
    })
    .toArray();

  let downgraded = 0;
  for (const user of users) {
    await db.collection("users").updateOne(
      {_id: user._id},
      {
        $set: {
          "subscription.tier": "free",
          "premium: false,
          updatedAt: new Date(),
        },
      },
    );
    downgraded += 1;
    if (user.email) {
      await sendSubscriptionExpiredEmail(user.email).catch(() => undefined);
    }
  }

  return res.status(200).json({success: true, data: {scanned: users.length, downgraded}});
}