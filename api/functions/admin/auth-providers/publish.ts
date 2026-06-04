import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { PublicAuthProviders, SocialProvider } from "@upcat/shared";
import { SOCIAL_PROVIDERS } from "@upcat/shared";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { getAuthProviderSettings } from "../../src/oidc/settings.js";

/**
 * POST /api/admin/auth/providers/publish
 *
 * Exports public auth provider visibility config as a static snapshot for
 * client/public/data/auth-providers.json.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const db = await getDb();
        const settings = await getAuthProviderSettings(db);

        const providers = {} as PublicAuthProviders;
        for (const p of SOCIAL_PROVIDERS as readonly SocialProvider[]) {
            const cfg = settings.providers[p];
            const usable = cfg.enabled && !!cfg.clientId && !!cfg.clientSecretEnc && !!cfg.redirectUri;
            providers[p] = {
                enabled: usable,
                clientId: usable ? cfg.clientId : null,
            };
        }

        const payload = {
            version: 1,
            publishedAt: new Date().toISOString(),
            publishedBy: admin.email,
            meta: {
                enabledProviders: (SOCIAL_PROVIDERS as readonly SocialProvider[]).filter(
                    (p) => providers[p].enabled,
                ).length,
            },
            providers,
        };

        return res.status(200).json({
            success: true,
            data: {
                exported: true,
                contentSize: JSON.stringify(payload).length,
                payload,
            },
        });
    } catch (error) {
        console.error("Auth.providers.publish.error:", error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to publish auth providers",
        });
    }
}