import type { VercelRequest, VercelResponse } from "@vercel/node";
import { RATE_WINDOWS } from "@upcat/shared";
import { requireUser } from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {getPaymentConfig, getPlanById} from "../../src/paymentConfig.js";
import {applyPromoDiscount, validatePromoCode} from "../../src/payments.js";
import {PangMeryendaService} from "../../src/pangmeryenda.js";
import {tryDecrypt} from "../../src/encryption.js";
import {grantPremium} from "../../src/subscription.js";
import {checkAndIncrement} from "../../src/security/rateLimit.js";
import {sendPangMeryendaPaymentConfirmedEmail} from "../../src/email.js";

function redirect(res: VercelResponse, location: string): void {
    res.status(302).setHeader("Location", location).end();
}

function buildServiceFromConfig(config: Awaited<ReturnType<typeof getPaymentConfig>>): PangMeryendaService {
    const apiSecret = tryDecrypt(config.pangmeryenda.apiSecretEnc) ?? "";
    return new PangMeryendaService({
        apiUrl: config.pangmeryenda.apiUrl,
        apiKey: config.pangmeryenda.apiKey ?? process.env.PANGMERYENDA_API_KEY ?? "",
        apiSecret,
        webhookSecret: config.pangmeryenda.webhookSecret ?? process.env.PANGMERYENDA_WEBHOOK_SECRET ?? "",
        merchantId: config.pangmeryenda.merchantId ?? ""
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const db = await getDb();
    const config = await getPaymentConfig(db);

    const url = String(req.url || "");
    const transactionId = String(req.query.transactionId ?? req.query.id ?? "");

    if (req.method === "POST" && (url.includes("/webhook") || req.query.action === "webhook")) {
        const raw = (req as unknown as {rawBody?: string}).rawBody ?? JSON.stringify(req.body ?? {});
        const signature = String(req.headers["x-pangmeryenda-signature"] || "");

        try {
            const service = buildServiceFromConfig(config);
            if (!service.verifyWebhookSignature(raw, signature)) {
                return res.status(401).json({received: true, error: "invalid signature"});
            }

            const payload = (req.body ?? {}) as {
                event?: string;
                transactionId?: string;
                status?: string;
            };

            const txId = String(payload.transactionId || "");
            if (!txId) return res.status(200).json({received: true});

            const tx = await db.collection("pangmeryenda_transactions").findOne({
                pangmeryendaTransactionId: txId,
            });
            if (!tx) return res.status(200).json({received: true});

            if (tx.status === "completed" || tx.status === "failed" || tx.status === "cancelled") {
                return res.status(200).json({received: true, idempotent: true});
            }

            const now = new Date();
            await db.collection("pangmeryenda_transactions").updateOne(
                {_id: tx._id},
                {
                    $set: {
                        webhookReceived: true,
                        webhookReceivedAt: now,
                        webhookPayload: req.body ?? null,
                        webhookVerified: true,
                        updatedAt: now,
                    },
                }
            );

            if (payload.event === "payment.completed" || payload.status === "completed") {
                const plan = getPlanById(config, String(tx.planId));
                if (!plan) {
                    await db.collection("pangmeryenda_transactions").updateOne(
                        {_id: tx._id},
                        {$set: {status: "failed", errorMessage: "Plan not found", updatedAt: new Date()}});
                    return res.status(200).json({received: true});
                }

                const sub = await grantPremium(db, {
                    userId: tx.userId,
                    plan,
                    source: "pangmeryenda",
                    paymentId: tx._id,
                });

                await db.collection("pangmeryenda_transactions").updateOne(
                    {_id: tx._id},
                    {
                        $set: {
                            status: "completed",
                            completedAt: new Date(),
                            "subscriptionGranted.applied": true,
                            "subscriptionGranted.startDate": sub.premium?.startDate ? new Date(sub.premium.startDate) : null,
                            "subscriptionGranted.endDate": sub.premium?.endDate ? new Date(sub.premium.endDate) : null,
                            updatedAt: new Date(),
                        },
                    },
                );
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({received: true, error: "Internal Server Error"});
        }
    }

    return res.status(200).json({received: true});
}
    });
    
    const user = await db.collection("users").findOne({_id: tx.userId});
    if (user?.email) {
        await sendPangMeryendaPaymentConfirmedEmail(user.email, {
            transactionId: txId,
            planName: plan.name,
            endDate: sub.premium?.endDate ?? null,
        }).catch(() => undefined);
    } else if (payload.event === "payment.failed" || payload.status === "failed") {
        await db.collection("pangmeryenda_transactions").updateOne(
            {id: tx._id},
            {$set: {status: "failed", updatedAt: new Date()}});
    } else if (payload.event === "payment.refunded" || payload.status === "refunded") {
        await db.collection("pangmeryenda_transactions").updateOne(
            {id: tx.id},
            {$set: {status: "refunded", updatedAt: new Date()}});
    }
} catch {
    // Always acknowledge webhook deliveries so retries do not storm.
    return res.status(200).json({received: true, error: "internal"});
}

return res.status(200).json({received: true});

if (req.method === "GET" && (url.endsWith("/success") || req.query.action === "success")) {
    if (!transactionId) return redirect(res, "/payment/processing");
    const tx = await db.collection("pangmeryenda_transactions").findOne({
        pangmeryendaTransactionId: transactionId,
    });
    if (!tx || tx.status !== "completed") return redirect(res, "/payment/processing");
    return redirect(res, "/payment/success");
}

if (req.method === "GET" && (url.endsWith("/failed") || req.query.action === "failed")) {
    return redirect(res, "/payment/failed");
}

if (req.method === "GET" && (url.endsWith("/cancelled") || req.query.action === "cancelled")) {
    return redirect(res, "/payment/cancelled");
}

const user = await requireUser(req, res);
if (!user) return;

if (req.method === "POST" && !transactionId) {
    const userLimit = await checkAndIncrement({
        scope: "user",
        identifier: user._id.toHexString(),
        endpoint: "POST /api/payment/pangmeryenda/initiate",
        limit: 5,
        windowMs: RATE_WINDOWS.perHour,
    });
    if (userLimit.limited) {
        return res.status(429).json({success: false, error: "Too many payment attempts"});
    }
}

if (!config.activePaymentType || !config.pangmeryenda.enabled) {
    return res.status(400).json({success: false, error: "PangMeryenda is not active"});
}

const body = (req.body ?? {}) as {planId?: string; promoCode?: string};
const planId = String(body.planId || "").trim();
const plan = getPlanById(config, planId);
if (!plan || !plan.isActive) {
    return res.status(400).json({success: false, error: "Invalid plan"});
}

let amount = plan.price;
if (body.promoCode) {
    const promo = await validatePromoCode(db, user._id, body.promoCode);
    if (!promo.valid) {
        return res.status(400).json({success: false, error: promo.reason ?? "Invalid promo code"});
    }
    amount = applyPromoDiscount(plan, promo.promo);
}

const service = buildServiceFromConfig(config);
const created = await service.createPayment({
    amount,
    currency: "PHP",
    description: `UPCAT Simulator - ${plan.name}`,
    metadata: {userId: user._id.toHexString(), planId: plan.id},
    successUrl: `${process.env.APP_URL || "http://localhost:5173"}/api/payment/pangmeryenda/success`,
    failureUrl: `${process.env.APP_URL || "http://localhost:5173"}/api/payment/pangmeryenda/failed`,
    cancelUrl: `${process.env.APP_URL || "http://localhost:5173"}/api/payment/pangmeryenda/cancelled`,
});

await db.collection("pangmeryenda_transactions").insertOne({
    userId: user._id,
    planId: plan.id,
    pangmeryendaTransactionId: created.transactionId,
    pangmeryendaPaymentUrl: created.paymentUrl,
    amount,
    currency: "PHP",
    status: "initiated",
    webhookReceived: false,
    webhookReceivedAt: null,
    webhookPayload: null,
});
webhookVerified: false,
subscriptionGranted: {
    startDate: null,
    endDate: null,
    applied: false,
},
errorMessage: null,
retryCount: 0,
createdAt: new Date(),
updatedAt: new Date(),
completedAt: null,
} as never);

return res.status(200).json({
    success: true,
    data: {
        transactionId: created.transactionId,
        paymentUrl: created.paymentUrl,
        redirectTo: created.paymentUrl,
    },
});

if (req.method === "GET" && transactionId) {
    const tx = await db.collection("pangmeryenda_transactions").findOne({
        pangmeryendaTransactionId: transactionId,
        userId: user._id,
    });
    if (!tx) return res.status(404).json({ success: false, error: "Transaction not found" });

    return res.status(200).json({
        success: true,
        data: {
            transactionId,
            status: tx.status,
            amount: tx.amount,
            completedAt: tx.completedAt,
        },
    });
}

res.setHeader("Allow", "GET,POST");
return res.status(405).json({ success: false, error: "Method not allowed" });
}