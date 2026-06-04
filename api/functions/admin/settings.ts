/**
 * Platform-wide settings.
 * GET /api/admin/settings → current settings
 * PUT /api/admin/settings → patch settings
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {getPlatformSettings, savePlatformSettings} from "../../src/platformSettings.js";
import {logActivity} from "../../src/activityLog.js";
import type {PlatformSettings} from "@upcat/shared";
import {SOCIAL_PROVIDERS, type SocialProvider} from "@upcat/shared";
import {getAuthProviderSettings} from "../../src/oidc/settings.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const db = await getDb();

    if (req.method === "GET") {
        const current = await getPlatformSettings(db);
        return res.status(200).json({success: true, data: current});
    }

    if (req.method === "PUT") {
        const patch = (req.body ?? {}) as Partial<PlatformSettings>;

        const current = await getPlatformSettings(db);
        const nextRegistration = {
            ...current.registration,
            ...(patch.registration ?? {}),
        };

        if (nextRegistration.allowEmailSignup === false) {
            const authSettings = await getAuthProviderSettings(db);
            const hasEnabledSocialProvider = (SOCIAL_PROVIDERS as readonly SocialProvider[]).some((provider) => {
                const cfg = authSettings.providers[provider];
                return Boolean(cfg?.enabled && cfg.clientId && cfg.clientSecretEnc && cfg.redirectUri);
            });
            if (!hasEnabledSocialProvider) {
                return res.status(400).json({
                    success: false,
                    error: "At least one social login provider must be enabled before disabling email sign-up.",
                });
            }
        }

        const merged = await savePlatformSettings(db, patch);
        await logActivity(db, {
            actorId: admin._id,
            actorRole: "admin",
            action: "admin.settings_updated",
            targetType: "settings",
            targetId: null,
        });
        return res.status(200).json({success: true, data: merged});
    }

    res.setHeader("Allow", "GET,PUT");
    return res.status(405).json({success: false, error: "Method not allowed"});
}