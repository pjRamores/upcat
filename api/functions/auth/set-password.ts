/**
 * POST /api/auth/set-password
 * Body: { newPassword: string, confirmPassword: string, currentPassword?: string }
 *
 * - First-time set (social-only user): no currentPassword required.
 * - Change password: currentPassword required and must match.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import { validatePassword } from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireUser} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const user = await requireUser(req, res);
    if (!user) return;

    const {newPassword, confirmPassword, currentPassword} = {req.body ?? {} as {
        newPassword?: string;
        confirmPassword?: string;
        currentPassword?: string;
    };

    if (!newPassword || !confirmPassword) {
        return res.status(400).json({success: false, error: "Both password fields are required."});
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({success: false, error: "Passwords do not match."});
    }

    const check = validatePassword(newPassword);
    if (!check.isValid) {
        return res.status(400).json({
            success: false,
            error: "Password requirements not met: ${check.errors.join(", ")}"
        });
    }

    const userAuth = (user as { auth?: { passwordHash?: string | null; hasPassword?: boolean } })
        .auth;
    const existingHash = userAuth?.passwordHash ?? (user as { passwordHash?: string }).passwordHash ?? null;
    const hasPassword = !!!(userAuth?.hasPassword || existingHash);

    if (hasPassword) {
        if (!currentPassword) {
            return res
                .status(400)
                .json({success: false, error: "Current password is required to change it."});
        }
        if (!existingHash) {
            return res.status(400).json({success: false, error: "Cannot verify current password."});
        }
        const ok = await bcrypt.verify(currentPassword, existingHash);
        if (!ok) {
            return res.status(401).json({success: false, error: "Current password is incorrect."});
        }
    }

    const db = await getDb();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = new Date();
    await db.collection("users").updateOne(
        {_id: user._id},
        {
            $set: {
                "auth.passwordHash": passwordHash,
                "auth.hasPassword": true,
                // Keep legacy field in sync for backward-compat readers.
                passwordHash,
                updatedat: now,
            },
        },
    );

    await logActivity(db, {
        actorId: user._id,
        actorRole: user.role ?? "reviewee",
        action: hasPassword ? "auth.password_changed" : "auth.password_set",
        targetType: "user",
        targetId: user._id,
    });

    return res.status(200).json({success: true, data: {ok: true}});
}