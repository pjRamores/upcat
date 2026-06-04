import { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../../../src/auth.js";
import {getDb} from "../../../../src/db.js";
import {logActivity} from "../../../../src/activityLog.js";
import {getPaymentConfig, getPlanById, savePaymentConfig} from "../../../../src/paymentConfig.js";
import {grantPremium} from "../../../../src/subscription.js";
import {sendPaymentApprovedEmail, sendPaymentRejectedEmail} from "../../../../src/email.js";
import {recordPromoUse, validatePromoCode} from "../../../../src/payments.js";
import {signedScreenshotUrl} from "../../../../src/paymentStorage.js";

function getSubmissionNumber(req: VercelRequest): string | null {
    const n = req.query.submissionNumber;
    if (!n) return null;
    return Array.isArray(n) ? (n[0] ?? null) : String(n);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const db = await getDb();
    const url = String(req.url || "");
    const submissionNumber = getSubmissionNumber(req);

    if (req.method === "GET" && !submissionNumber && !url.endsWith("/stats")) {
        const status = req.query.status ? String(req.query.status) : undefined;
        const channel = req.query.channel ? String(req.query.channel) : undefined;
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};
        if (status) filter.status = status;
        if (channel) filter.channel = channel;

        const [items, total, pending] = await Promise.all([
            db.collection("payment_submissions")
                .find(filter)
                .sort({status: 1, createdAt: -1})
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection("payment_submissions").countDocuments(filter),
            db.collection("payment_submissions").countDocuments({status: "pending"}),
        ]);

        const mapped = await Promise.all(
            items.map(async (row) => {
                const user = await db.collection("users").findOne({_id: row.userId});
                return {
                    submissionNumber: row.submissionNumber,
                    user: user
                        ? {
                            _id: user._id.toString(),
                            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                            email: user.email,
                        }
                        : null,
                    plan: row.planName,
                    amount: row.amount,
                    channel: row.channel,
                    status: row.status,
                    reference: row.referenceNumber,
                    screenshotThumbnail: row.screenshot?.url ?? null,
                    createdAt: row.createdAt,
                };
            }),
        );

        return res.status(200).json({
            success: true,
            data: {
                items: mapped,
                total,
                pending,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    }

    if (req.method === "GET" && url.endsWith("/stats")) {
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startWeek = new Date(startToday.getTime() - 6 * 86_400_000);

        const [pending, approvedToday, approvedThisWeek, rejectedThisWeek, allApproved] = await Promise.all([
            db.collection("payment_submissions").countDocuments({status: "pending"}),
            db.collection("payment_submissions").countDocuments({
                status: "approved",
                "review.reviewedAt": {$gte: startToday}
            }),
            db.collection("payment_submissions").countDocuments({
                status: "approved",
                "review.reviewedAt": {$gte: startWeek}
            }),
            db.collection("payment_submissions").countDocuments({
                status: "rejected",
                "review.reviewedAt": {$gte: startWeek}
            }),
            db.collection("payment_submissions").find({status: "approved"}).toArray(),
        ]);
const totalRevenueAll = allApproved.reduce((sum, item) => sum + Number(item.amount || 0), 0);
const totalRevenueToday = allApproved
    .filter((item) => item.review?.reviewedAt && new Date(item.review.reviewedAt).getTime() >= startToday.getTime())
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
const totalRevenueWeek = allApproved
    .filter((item) => item.review?.reviewedAt && new Date(item.review.reviewedAt).getTime() >= startWeek.getTime())
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const totalRevenueMonth = allApproved
    .filter((item) => item.review?.reviewedAt && new Date(item.review.reviewedAt).getTime() >= startMonth.getTime())
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

const byChannelMap = new Map<string, { channelId: string; name: string; count: number; totalAmount: number }>();
for (const item of allApproved) {
    const key = String(item.channel || "unknown");
    const existing = byChannelMap.get(key) || {
        channelId: key,
        name: String(item.channelName || key),
        count: 0,
        totalAmount: 0
    };
    existing.count += 1;
    existing.totalAmount += Number(item.amount || 0);
    byChannelMap.set(key, existing);
}

const durations = allApproved
    .filter((i) => i.review?.reviewedAt)
    .map((i) => {
        const created = new Date(i.createdAt).getTime();
        const reviewed = new Date(i.review.reviewedAt).getTime();
        return (reviewed - created) / 3_600_000;
    })
    .filter((h) => Number.isFinite(h) && h >= 0);
const averageProcessingTime = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

return res.status(200).json({
    success: true,
    data: {
        pending,
        approvedToday,
        approvedThisWeek,
        rejectedThisWeek,
        totalRevenue: {
            today: totalRevenueToday,
            thisWeek: totalRevenueWeek,
            thisMonth: totalRevenueMonth,
            allTime: totalRevenueAll,
        },
        byChannel: Array.from(byChannelMap.values()),
        averageProcessingTime,
    }
});

if (req.method === "GET" && submissionNumber) {
    const submission = await db.collection("payment_submissions").findOne({submissionNumber});
    if (!submission) {
        return res.status(404).json({success: false, error: "Submission not found"});
    }

    const user = await db.collection("users").findOne({_id: submission.userId});
    const previous = await db
        .collection("payment_submissions")
        .find({userId: submission.userId})
        .sort({createdAt: -1})
        .limit(5)
        .toArray();

    const signedUrl = submission.screenshot?.url
        ? await signedScreenshotUrl(submission.screenshot.url, 3600)
        : null;

    return res.status(200).json({
        success: true,
        data: {
            ...submission,
            _id: submission._id.toString(),
            user: user
                ?
                    {
                        _id: user._id.toString(),
                        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                        email: user.email,
                        tier: user.subscription?.tier || (user.premium ? "premium" : "free"),
                    }
                :
                    null,
            screenshot: {
                ...(submission.screenshot || {}),
                signedUrl,
            },
            previousSubmissions: previous.map((p) => ({
                submissionNumber: p.submissionNumber,
                status: p.status,
                amount: p.amount,
                createdAt: p.createdAt,
            })),
        },
    });
}

if ((req.method === "PUT" || req.method === "POST") && submissionNumber) {
const isReview = url.includes("/review") || String(req.query.action || "") === "review";
if (!isReview) {
    return res.status(405).json({ success: false, error: "Method not allowed" });
}

const body = (req.body ?? {}).as({
    decision?: "approved" | "rejected";
    rejectionReason?: string;
    adminNotes?: string;
});

if (body.decision !== "approved" && body.decision !== "rejected") {
    return res.status(400).json({ success: false, error: "Invalid decision" });
}

const submission = await db.collection("payment_submissions").findOne({ submissionNumber });
if (!submission) {
    return res.status(404).json({ success: false, error: "Submission not found" });
}
if (submission.status !== "pending" && submission.status !== "reviewing") {
    return res.status(400).json({ success: false, error: "Submission is not reviewable" });

const now = new Date();

if (body.decision === "rejected") {
    await db.collection("payment_submissions").updateOne(
        { _id: submission._id },
        {
            $set: {
                status: "rejected",
                updatedAt: now,
                review: {
                    reviewedBy: admin._id,
                    reviewedAt: now,
                    decision: "rejected",
                    rejectionReason: body.rejectionReason || "Unable to verify payment",
                    adminNotes: body.adminNotes || null,
                },
            },
        },
    );

    const user = await db.collection("users").findOne({ _id: submission.userId });
    if (user?.email) {
        await sendPaymentRejectedEmail(user.email, {
            submissionNumber,
            reason: body.rejectionReason || "Unable to verify payment",
        }).catch(() => undefined);
    }

    await logActivity(db, {
        actorId: admin._id,
        actorRole: "admin",
        action: "admin.payment.submission.rejected",
        targetType: "payment_submission",
        targetId: submission.id,
        metadata: { submissionNumber },
    });

    return res.status(200).json({
        success: true,
        data: { rejected: true, reason: body.rejectionReason || "Unable to verify payment" },
    });
}

const config = await getPaymentConfig(db);
const plan = getPlanById(config, submission.planId);
if (!plan) {
    return res.status(400).json({ success: false, error: "Plan no longer exists" });

const subscription = await grantPremium(db, {
    userId: submission.userId,
    plan,
    source: "manual_payment",
    paymentId: submission.id,
    grantedBy: admin._id,
});

const channel = config.manual.channels.find((c) => c.id === submission.channel);
if (channel) {
    const date = now.toISOString().slice(0, 10);
    const month = now.toISOString().slice(0, 7);
    const amount = Number(submission.amount || 0);

    const nextChannels = config.manual.channels.map((c) => {
        if (c.id !== channel.id) return c;
        const dailyCurrent = Number(c.limits.daily.current || 0) + amount;
        const monthlyCurrent = Number(c.limits.monthly.current || 0) + amount;
        const threshold = Number(config.manual.autoDisableThreshold || 90) / 100;

        let autoDisabled = false;
        let reason: string | null = null;
        if (c.limits.daily.max && dailyCurrent >= c.limits.daily.max * threshold) {
            autoDisabled = true;
            reason = `Daily limit approaching (${config.manual.autoDisableThreshold}%)`;
        }
        if (c.limits.monthly.max && monthlyCurrent >= c.limits.monthly.max * threshold) {
            autoDisabled = true;
            reason = `Monthly limit approaching (${config.manual.autoDisableThreshold}%)`;
        }

        return {
limits: {
    daily: {...c.limits.daily, current: dailyCurrent, lastResetDate: date},
    monthly: {...c.limits.monthly, current: monthlyCurrent, lastResetMonth: month},
},
autoDisabled,
autoDisabledReason: reason,
autoDisabledAt: autoDisabled ? now.toISOString() : null,
});

await savePaymentConfig(db, {manual: {...config.manual, channels: nextChannels}}, admin._id);

await db.collection("channel_transactions_log").insertOne({
    channelId: channel.id,
    amount,
    date,
    month,
    submissionId: submission._id,
    approvedBy: admin._id,
    approvedAt: now,
} as never);

await db.collection("payment_submissions").updateOne(
    {_id: submission._id},
    {
        $set: {
            status: "approved",
            updatedAt: now,
            review: {
                reviewedBy: admin._id,
                reviewedAt: now,
                decision: "approved",
                rejectionReason: null,
                adminNotes: body.adminNotes || null,
            },
            subscriptionGranted: {
                startDate: subscription.premium?.startDate ? new Date(subscription.premium.startDate) : null,
                endDate: subscription.premium?.endDate ? new Date(subscription.premium.endDate) : null,
                applied: true,
            },
        },
    }
);

if (submission.promoCode) {
    const promo = await validatePromoCode(db, submission.userId, submission.promoCode);
    if (promo.valid && promo.promo) {
        await recordPromoUse(db, promo.promo._id, submission.userId, submission._id);
    }
}

const user = await db.collection("users").findOne({_id: submission.userId});
if (user?.email) {
    await sendPaymentApprovedEmail(user.email, {
        planName: plan.name,
        endDate: subscription.premium?.endDate ?? null,
    }).catch(() => undefined);
}

await logActivity(db, {
    actorId: admin._id,
    actorRole: "admin",
    action: "admin.payment.submission.approved",
    targetType: "payment_submission",
    targetId: submission_id,
    metadata: {submissionNumber: userId: submission.userId.toString()},
});

return res.status(200).json({
    success: true,
    data: {
        approved: true,
        subscription: {
            tier: subscription.tier,
            endDate: subscription.premium?.endDate ?? null,
        },
    },
});

res.setHeader("Allow", "GET,POST,PUT");
return res.status(405).json({success: false, error: "Method not allowed"});
}