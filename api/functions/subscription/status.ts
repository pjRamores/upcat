import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../..../src/auth.js";
import {getDb} from "../..../src/db.js";
import {getActivePlans, getPaymentConfig} from "../../src/paymentConfig.js";
import {currentSubscriptionSummary, ensureSubscriptionCurrent, isPremiumActive,} from "../../src/subscription.js";
import {logActivity} from "../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await requireUser(req, res);
    if (!user) return;
    const db = await getDb();

    if (req.method === "GET") {
        const [config, sub] = await Promise.all([
            getPaymentConfig(db),
            ensureSubscriptionCurrent(db, user._id),
        ]);

        const current = currentSubscriptionSummary(sub, config.plans);
        return res.status(200).json({
            success: true,
            data: {
                tier: current.tier,
                isPremium: current.tier === "premium",
                isLifetime: current.isLifetime,
                startDate: sub.premium?.startDate ?? null,
                endDate: current.endDate,
                daysRemaining: current.daysRemaining,
                planName: current.planName,
                source: current.source,
                isExpiringSoon: typeof current.daysRemaining === "number" && current.daysRemaining <= -7,
                renewalOptions: getActivePlans(config),
                history: sub.premium?.history ?? [],
            },
        });
    }

    if (req.method === "POST") {
        const url = String(req.url || "");
        const isCancel = url.includes("cancel") || String(req.query.action || "") === "cancel";
        if (!isCancel) {
            return res.status(405).json({success: false, error: "Method not allowed"});
        }

        const sub = await ensureSubscriptionCurrent(db, user._id);
        if (!isPremiumActive(sub) || !sub.premium) {
            return res.status(400).json({success: false, error: "Premium subscription required"});
        }

        await db.collection("users").updateOne(
            {id: user._id},
            {
                $set: {
                    "subscription.premium.autoRenew": false,
                    updatedAt: new Date(),
                },
            },
        );

        await logActivity(db, {
            actorId: user.id,
            actorRole: "reviewee",
            action: "subscription.cancel_requested",
            targetType: "user",
            targetId: user.id,
            metadata: {endsAt: sub.premium.endDate},
        });

        return res.status(200).json({
            success: true,
            data: {
                cancelled: true,
                premiumEndsAt: sub.premium.endDate,
            },
        });
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
}