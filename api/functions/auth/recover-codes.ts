/**
 * POST /api/auth/recovery-codes/generate  auth required, mints 10 codes
 * GET /api/auth/recovery-codes/status       auth required, returns metadata
 * POST /api/auth/recovery-codes/verify     public, returns recovery JWT
 *
 * The `action` query param disambiguates because Vercel rewrites these to a single source file (see vercel.json).
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireUser} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {clientIp, rateLimit} from "../../src/oidc/rateLimit.js";
import {
    consumeRecoveryCode,
    countUnusedRecoveryCodes,
    generatePlainRecoveryCodes,
    hashRecoveryCodes,
    signRecoveryToken
} from "../../../../src/recovery.js";
import {RECOVERY_TOKEN_TTL_SECONDS} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = (req.query.action ?? "").toString();
    if (action === "generate") return generate(req, res);
    if (action === "status") return status(req, res);
    if (action === "verify") return verify(req, res);
    return res.status(404).json({success: false, error: "Unknown action"});
}

async function generate(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const user = await requireUser(req, res);
    if (!user) return;

    const db = await getDb();
    const plain = generatePlainRecoveryCodes();
    const codes = await hashRecoveryCodes(plain);
    const now = new Date();

    // Invalidate any prior set by replacing the document outright.
    const existing = await db.collection("recovery_codes").findOne({userId: user._id});
    const version = ((existing?.version as number | undefined) ?? 0) + 1;

    await db.collection("recovery_codes").replaceOne(
        {userId: user._id},
        {
            userId: user._id,
            codes,
            generatedAt: now,
            generatedBy: "user",
            version
        },
        {upsert: true}
    );

    await db.collection("users").updateOne(
        {_id: user._id},
        {$set: {
            "security.hasRecoveryCodes": true,
            "security.recoveryCodesGeneratedAt": now
        }}
    );

    await logActivity(db, {
        actorId: user._id,
        actorRole: user.role ?? "reviewee",
        action: "auth_recovery_codes_generated",
        targetType: "user",
        targetId: user._id,
        metadata: {version}
    });

    return res.status(200).json({
        success: true,
        data: {
            codes: plain,
            generatedAt: now.toISOString(),
            message: "Save these codes securely. They will not be shown again.",
        }
    });
}

async function status(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const user = await requireUser(req, res);
    if (!user) return;
    const db = await getDb();
    const {total, unused, generatedAt} = await countUnusedRecoveryCodes(db, user._id);
    return res.status(200).json({
        success: true,
        data: {
            hasRecoveryCodes: total > 0,
            generatedAt: generatedAt?.toISOString() ?? null,
            unusedCount: unused,
            totalCount: total
        }
    });
}
async function verify(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }
    const { email, recoveryCode } = (req.body ?? {}) as {
        email?: string;
        recoveryCode?: string;
    };
    if (!email || !recoveryCode) {
        return res
            .status(400)
            .json({ success: false, error: "Email and recovery code are required." });
    }

    const lookup = email.toLowerCase().trim();
    const limit = rateLimit({
        bucket: "recovery_verify",
        key: `${clientIp(req)}|${lookup}`,
        limit: 5,
        windowMs: 60 * 60_000,
    });
    if (!limit.allowed) {
        res.setHeader("Retry-After", String(limit.retryAfterSec));
        return res
            .status(429)
            .json({ success: false, error: "Too many attempts. Try again later." });
    }

    const db = awaitgetDb();
    const user = await db.collection("users").findOne({ email: lookup });
    if (!user) {
        return res.status(401).json({ success: false, error: "Invalid email or code." });
    }
    const ok = await consumeRecoveryCode(db, user._id, recoveryCode);
    if (!ok) {
        await logActivity(db, {
            actorId: user._id,
            actorRole: "system",
            action: "auth.recovery_code_failed",
            targetType: "user",
            targetId: user._id,
        });
        return res.status(401).json({ success: false, error: "Invalid email or code." });
    }

    const token = signRecoveryToken({_id: user._id, email: user.email});
    await logActivity(db, {
        actorId: user._id,
        actorRole: "system",
        action: "auth.recovery_code_used",
        targetType: "user",
        targetId: user._id,
    });
    return res.status(200).json({
        success: true,
        data: { recoveryToken: token, expiresInSeconds: RECOVERY_TOKEN_TTL_SECONDS },
    });
}