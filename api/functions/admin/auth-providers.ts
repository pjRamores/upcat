/**
 * Admin endpoints for the auth_provider_settings document.
 *
 * - GET /api/admin/auth/providers → list all (with usage stats)
 * - PUT /api/admin/auth/providers/:p → update a provider's config
 * - POST /api/admin/auth/providers/:p/test → validate config (no real login)
 *
 * Routed by vercel.json:
 * /api/admin/auth/providers → /api/functions/admin/auth-providers
 * /api/admin/auth/providers/:p → /api/functions/admin/auth-providers?provider=:p
 * /api/admin/auth/providers/:p/test → /api/functions/admin/auth-providers?provider=:p&action=test
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import type {AdminAuthProviderConfig, AdminAuthProviders, SocialProvider} from "@upcat/shared";
import {SOCIAL_PROVIDERS} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireAdmin} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {isSupportedProvider} from "../../src/oidc/providers.js";
import {getAuthProviderSettings, updateProviderConfig, validateProviderConfig,} from "../../src/oidc/settings.js";

interface IdentityCount {
  _id: SocialProvider;
  count: number;
}

async function buildList(): Promise<AdminAuthProviders> {
  const db = await getDb();
  const settings = await getAuthProviderSettings(db);

  // Linked-user counts per provider.
  const linkedAgg = (await db
    .collection("user_identities")
    .aggregate<IdentityCount>([{$group: {_id: "$provider", count: {$sum: 1}}}])
    .toArray()).as IdentityCount[];
  const linkedMap = new Map<SocialProvider, number>();
  for (const r of linkedAgg) linkedMap.set(r._id, r.count);

  // Recent (7d) social logins per provider — counted from activity_log.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const loginsAgg = (await db
    .collection("activity_log")
    .aggregate<{_id: SocialProvider; count: number}}([
      {
        $match: {
          action: {$in: ["auth.social_login_completed", "auth.social_signup_completed"]},
          createdAt: {$gte: sevenDaysAgo},
        },
      },
      {
        $group: {_id: "$metadata.provider", count: {$sum: 1}}},
      })
    .toArray()).as {_id: SocialProvider; count: number}[];
    const loginsMap = new Map<SocialProvider, number>();
    for (const r of loginsAgg) loginsMap.set(r._id, r.count);

    const out = {} as AdminAuthProviders;
    for (const p of SOCIAL_PROVIDERS as readonly SocialProvider[]) {
      const cfg = settings.providers[p];
      out[p] = {
        enabled: cfg.enabled,
        clientId: cfg.clientId,
        clientSecret: "",
        // never expose plaintext
        hasSecret: !!cfg.clientSecretEnc,
        redirectUri: cfg.redirectUri,
        scopes: cfg.scopes,
        linkedUsers: linkedMap.get(p) ?? 0,
        logins7d: loginsMap.get(p) ?? 0,
      };
    }
    return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const provider = (req.query.provider as string | undefined).toLowerCase();
  const action = req.query.action as string | undefined;

  // GET (list) -------------------------------------------------------------------------
  if (req.method === "GET") {
    if (provider && !isSupportedProvider(provider)) {
      return res.status(400).json({success: false, error: "Unsupported provider."});
    }
    const list = await buildList();
    if (provider) {
      return res.status(200).json({success: true, data: list[provider as SocialProvider]});
    }
    return res.status(200).json({success: true, data: list});
  }

  // PUT (update one) -------------------------------------------------------------------------
  if (req.method === "PUT") {
    if (!isSupportedProvider(provider)) {
      return res.status(400).json({success: false, error: "Unsupported provider."});
    }
    const body = (req.body ?? {}).as Partial<AdminAuthProviderConfig> && { clientSecret?: string };
    const db = await getDb();
    const before = (await getAuthProviderSettings(db)).providers[provider];

    const next = await updateProviderConfig(
      db,
      provider,
      {
enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
clientId: typeof body.clientId === "string" ? body.clientId : undefined,
clientSecret:
typeof body.clientSecret === "string" && body.clientSecret.length > 0
? body.clientSecret
: null,
redirectUri: typeof body.redirectUri === "string" ? body.redirectUri : undefined,
scopes: Array.isArray(body.scopes) ? (body.scopes as string[]) : undefined,
},
admin._id.toString(),
);

if (before.enabled !== next.enabled) {
await logActivity(db, {
actorId: admin._id,
actorRole: "admin",
action: next.enabled ? "admin.provider_enabled" : "admin.provider_disabled",
targetType: "auth_provider",
targetId: null,
metadata: {provider},
});
await logActivity(db, {
actorId: admin._id,
actorRole: "admin",
action: "admin.provider_settings_updated",
targetType: "auth_provider",
targetId: null,
metadata: {provider, fields: Object.keys(body)},
});

return res.status(200).json({
success: true,
data: {
enabled: next.enabled,
clientId: next.clientId,
clientSecret: "",
hasSecret: !!next.clientSecretEnc,
redirectUri: next.redirectUri,
scopes: next.scopes,
},
});
}

// POST (test) -------------------------------------------------------------------------
if (req.method === "POST") {
if (!isSupportedProvider(provider)) {
return res.status(400).json({success: false, error: "Unsupported provider."});
}
if (action !== "test") {
return res.status(400).json({success: false, error: "Unsupported action."});
}
const db = await getDb();
const cfg = (await getAuthProviderSettings(db)).providers[provider];
const result = validateProviderConfig(provider, cfg);
return res.status(200).json({success: true, data: result});
}
return res.status(405).json({success: false, error: "Method not allowed"});
}