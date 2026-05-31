/**
 * Read/write helpers for the singleton `auth_provider_settings` document.
 * Secrets are encrypted at rest and never returned to the client unmasked.
 */
import type {Db} from "mongodb";
import type {SocialProvider} from "@upcat/shared";
import {SOCIAL_PROVIDER_META, SOCIAL_PROVIDERS} from "@upcat/shared";
import {encrypt, tryDecrypt} from "../encryption.js";
import {PROVIDER_ENDPOINTS} from "./providers.js";

export const AUTH_PROVIDER_SETTINGS_ID = "global";

export interface StoredProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecretEnc: string; // encrypted; "" when not set
  redirectUri: string;
  scopes: string[];
}

export interface AuthProviderSettingsDoc {
  _id: typeof AUTH_PROVIDER_SETTINGS_ID;
  providers: Record<SocialProvider, StoredProviderConfig>;
  updatedAt: Date;
  updatedBy: string | null;
}

/** Default empty config used when nothing is in the DB yet. */
function makeEmptyProviders(): Record<SocialProvider, StoredProviderConfig> {
  const out = {} as Record<SocialProvider, StoredProviderConfig>;
  for (const p of SOCIAL_PROVIDERS) {
    out[p] = {
      enabled: false,
      clientId: "",
      clientSecretEnc: "",
      redirectUri: "",
      scopes: [...SOCIAL_PROVIDER_META[p].defaultScopes],
    };
  }
  return out;
}

export async function getAuthProviderSettings(db: Db): Promise<AuthProviderSettingsDoc> {
  const col = db.collection<AuthProviderSettingsDoc>("auth_provider_settings");
  const doc = await col.findOne({_id: AUTH_PROVIDER_SETTINGS_ID});
  if (doc) {
    // Backfill any missing provider entries that may have been added later.
    const merged = {...makeEmptyProviders(), ...doc.providers};
    return {...doc, providers: merged};
  }
  // Initialize on first access.
  const fresh: AuthProviderSettingsDoc = {
    _id: AUTH_PROVIDER_SETTINGS_ID,
    providers: makeEmptyProviders(),
    updatedAt: new Date(),
    updatedBy: null,
  };
  await col.updateOne(
    {_id: AUTH_PROVIDER_SETTINGS_ID},
    {$setOnInsert: fresh},
    {upsert: true},
  );
  return fresh;
}

export async function getProviderConfig(
  db: Db,
  provider: SocialProvider,
): Promise<StoredProviderConfig> {
  const settings = await getAuthProviderSettings(db);
  return settings.providers[provider];
}

/**
 * Update a single provider's config. Pass clientSecret as plaintext
 * (string) to rotate it, omit / pass null to keep the existing value.
 */
export async function updateProviderConfig(
  db: Db,
  provider: SocialProvider,
  patch: {
    enabled?: boolean;
    clientId?: string;
    clientSecret?: string | null;
    redirectUri?: string;
    scopes?: string[];
  },
  actorId: string | null,
): Promise<StoredProviderConfig> {
  const current = await getProviderConfig(db, provider);
  const next: StoredProviderConfig = {
    enabled: patch.enabled ?? current.enabled,
    clientId: (patch.clientId ?? current.clientId).trim(),
    clientSecretEnc:
      patch.clientSecret === null || patch.clientSecret === ""
    ? current.clientSecretEnc
    : encrypt(patch.clientSecret),
    redirectUri: (patch.redirectUri ?? current.redirectUri).trim(),
    scopes:
      patch.scopes && patch.scopes.length > 0
    ? patch.scopes.map((s) => s.trim()).filter(Boolean)
    : current.scopes.length > 0
    ? current.scopes
    : [...PROVIDER_ENDPOINTS[provider].defaultScopes],
  };
}
await db.collection<AuthProviderSettingsDoc>("auth_provider_settings").updateOne(
  {_id: AUTH_PROVIDER_SETTINGS_ID},
  {
    $set: {
      [`providers.${provider}`]: next,
      updatedAt: new Date(),
      updatedBy: actorId,
    },
    },
    {upsert: true},
  );

  return next;
}

/** Decrypt the stored client secret (or null if not set / undecryptable). */
export function getClientSecret(stored: StoredProviderConfig): string | null {
  if (!stored.clientSecretEnc) return null;
  return tryDecrypt(stored.clientSecretEnc);
}

/**
 * Validate a provider config — used by the admin "Test" endpoint.
 * Returns a list of human-readable warnings (empty = looks good).
 */
export function validateProviderConfig(
  provider: SocialProvider,
  cfg: StoredProviderConfig,
) : {ok: boolean; warnings: string[]} {
  const w: string[] = [];
  const endpoints = PROVIDER_ENDPOINTS[provider];

  if (!cfg.clientId) w.push("Client ID is missing.");
  if (!cfg.clientSecretEnc) w.push("Client secret is missing.");
  else if (!tryDecrypt(cfg.clientSecretEnc))
    w.push("Stored client secret cannot be decrypted (encryption key may have changed).");

  if (!cfg.redirectUri) {
    w.push("Redirect URI is missing.");
  } else {
    try {
      const u = new URL(cfg.redirectUri);
      if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
        w.push("Redirect URI should use https://in-production.");
      }
    } catch {
      w.push("Redirect URI is not a valid URL.");
    }
  }

  if (!cfg.scopes || cfg.scopes.length === 0) {
    w.push("At least one scope is required.");
  } else if (provider !== "facebook" && !cfg.scopes.includes("openid")) {
    w.push('OIDC providers should include the "openid" scope.');
  }

  if (provider !== "facebook" && !endpoints.oidc) {
    w.push("Provider is not flagged as OIDC; id_token verification will be skipped.");
  }

  return {ok: w.length === 0, warnings: w};
}