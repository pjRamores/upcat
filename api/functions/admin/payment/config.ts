import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import { requireAdmin } from "../../src/auth.js";
import { getDB } from "../../src/db.js";
import { logActivity } from "../../src/activityLog.js";
import { getPaymentConfig, maskPaymentConfigSecrets, savePaymentConfig, } from "../../src/paymentConfig.js";
import { encrypt } from "../../../../src/encryption.js";

function hasPath(url: string, segment: string): boolean {
    return url.includes(segment);
}

async function confirmAdminPassword(
    admin: Awaited<ReturnType<typeof requireAdmin>>,
    password: string,
): Promise<boolean> {
    if (!admin) return false;
    const hash = (admin as unknown as { auth?: { passwordHash?: string | null } }).auth?.passwordHash ?? (admin as unknown as { passwordHash?: string | null }).passwordHash;
    if (!hash) return false;
    return await bcrypt.verify(password, hash);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const db = await getDB();
    const url = String(req.url || "");

    if (req.method === "GET") {
        const config = await getPaymentConfig(db);
        return res.status(200).json({ success: true, data: maskPaymentConfigSecrets(config) });
    }

    if (req.method !== "PUT" && req.method !== "POST") {
        res.setHeader("Allow", "GET,PUT,POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (hasPath(url, "/config/type") || body.action === "type") {
        const activePaymentType = String(body.activePaymentType || "");
        if (!["free", "manual", "pangmeryenda"].includes(activePaymentType)) {
            return res.status(400).json({ success: false, error: "Invalid payment type" });
        }

        const adminPassword = String(body.adminPassword || "");
        if (!adminPassword || !(await confirmAdminPassword(admin, adminPassword))) {
            return res.status(403).json({ success: false, error: "Password confirmation failed" });
        }

        const pending = await db.collection("payment_submissions").countDocuments({ status: "pending" });
        const config = await savePaymentConfig(
            db,
            { activePaymentType: activePaymentType as "free" | "manual" | "pangmeryenda" },
            admin._id,
        );
        await logActivity(db, {
            actorId: admin.id,
            actorRole: "admin",
            action: "admin.payment.config.type",
            targetType: "payment_config",
            targetId: null,
            metadata: { activePaymentType, pendingSubmissions: pending },
        });
        return res.status(200).json({
            success: true,
            data: {
                updated: true,
                activePaymentType: config.activePaymentType,
                warning: pending > 0 ? `${pending} pending submissions remain queued.` : null,
            },
        });
    }

    if (hasPath(url, "/config/plans") || body.action === "plans") {
        const plans = Array.isArray(body.plans) ? body.plans : null;
        if (!plans || plans.length === 0) {
            return res.status(400).json({ success: false, error: "Plans is required" });
        }
        const ids = new Set<string>();
        for (const plan of plans) {
            const id = String(plan as Record<string, unknown>).id || "";
            if (!id || ids.has(id)) {
                return res.status(400).json({ success: false, error: "Plan IDs must be unique" });
            }
            ids.add(id);
            const price = Number((plan as Record<string, unknown>).price);
            if (!Number.isFinite(price) || price < 0) {
                return res.status(400).json({ success: false, error: "Invalid plan price" });
            }
        }
        if (!plans.some((p) => (p as Record<string, unknown>).isActive)) {
            return res.status(400).json({ success: false, error: "At least one plan must be active" });
        }
        const config = await savePaymentConfig(db, { plans: plans as never }, admin._id);
        return res.status(200).json({ success: true, data: config.plans });
    }

    if (hasPath(url, "/config/manual") || body.action === "manual") {

const patch = {
    manual: {
        processingTimeMessage: typeof body.processingTimeMessage === "string" ? body.processingTimeMessage : undefined,
        instructionsHeader: typeof body.instructionsHeader === "string" ? body.instructionsHeader : undefined,
        instructionsBody: typeof body.instructionsBody === "string" ? body.instructionsBody : undefined,
        autoDisableThreshold: typeof body.autoDisableThreshold === "number" ? body.autoDisableThreshold : undefined,
        channels: Array.isArray(body.channels) ? (body.channels as never) : undefined,
    },
};

const config = await savePaymentConfig(db, patch as never, admin._id);
return res.status(200).json({ success: true, data: config.manual });

if (hasPath(url, "/config/pangmeryenda") || body.action === "pangmeryenda") {
    const config = await getPaymentConfig(db);

    const next = {
        ...config.pangmeryenda,
        apiBaseUrl: typeof body.apiBaseUrl === "string" ? body.apiBaseUrl : config.pangmeryenda.apiBaseUrl,
        apiKey: typeof body.apiKey === "string" ? body.apiKey : config.pangmeryenda.apiKey,
        apiSecretEnc: typeof body.apiSecret === "string" && body.apiSecret ? encrypt(body.apiSecret) : config.pangmeryenda.apiSecretEnc,
        webhookSecret: typeof body.webhookSecret === "string" ? body.webhookSecret : config.pangmeryenda.webhookSecret,
        merchantId: typeof body.merchantId === "string" ? body.merchantId : config.pangmeryenda.merchantId,
        planMapping: Array.isArray(body.planMapping) ? (body.planMapping as never) : config.pangmeryenda.planMapping,
        successRedirectUrl: typeof body.successRedirectUrl === "string" ? body.successRedirectUrl : config.pangmeryenda.successRedirectUrl,
        failureRedirectUrl: typeof body.failureRedirectUrl === "string" ? body.failureRedirectUrl : config.pangmeryenda.failureRedirectUrl,
        cancelRedirectUrl: typeof body.cancelRedirectUrl === "string" ? body.cancelRedirectUrl : config.pangmeryenda.cancelRedirectUrl,
    };

    const updated = await savePaymentConfig(db, { pangmeryenda: next }, admin._id);
    return res.status(200).json({ success: true, data: maskPaymentConfigSecrets(updated.pangmeryenda) });
}

if (hasPath(url, "/config/pangmeryenda/test") || body.action === "pangmeryenda-test") {
    const cfg = await getPaymentConfig(db);
    const connected = Boolean(
        cfg.pangmeryenda.apiBaseUrl &&
        (cfg.pangmeryenda.apiKey || process.env.PANGMERYENDA_API_KEY) &&
        cfg.pangmeryenda.merchantId,
    );
    return res.status(200).json({
        success: true,
        data: connected ? { connected: true, accountInfo: { merchantId: cfg.pangmeryenda.merchantId } } : { connected: false, error: "Missing PangMeryenda credentials" },
    });
}

return res.status(400).json({ success: false, error: "Unknown payment config action" });