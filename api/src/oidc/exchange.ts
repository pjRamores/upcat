/**
 * Provider code-exchange + profile normalization.
 *
 * - exchangeCode: server-side POST to the provider's token endpoint, using
 * client_secret + PKCE code_verifier. Never runs client-side.
 * - verifyIdToken: validates id_token signature (JWKS), iss, aud, nonce, exp.
 * - fetchUserinfo: fallback / non-OIDC profile lookup (Facebook).
 * - normalizeProfile: collapses provider quirks into NormalizedProfile.
 */
import {createRemoteJWKSet, type JWTPayload, jwtVerify} from "jose";
import type {NormalizedProfile, SocialProvider} from "@upcat/shared";
import {PROVIDER_ENDPOINTS} from "./providers.js";

export interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export async function exchangeCode(args: {
  provider: SocialProvider;
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const {provider, code, codeVerifier, clientId, clientSecret, redirectUri} = args;
  const endpoints = PROVIDER_ENDPOINTS[provider];

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  });

  const res = await fetch(endpoints.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const text = await res.text();
  let parsed: TokenResponse & {error?: string; error_description?: string};
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    throw new Error(`[${provider}] token endpoint returned non-JJSON (${res.status})`);
  }
  if (!res.ok || parsed.error) {
    const msg = parsed.error_description || parsed.error || `HTTP ${res.status}`;
    throw new Error(`[${provider}] token exchange failed: ${msg}`);
  }
  if (!parsed.access_token) {
    throw new Error(`[${provider}] token response missing access_token`);
  }
  return parsed;
}

// JWKS cache per-jwksUri (created once and re-used across warm invocations).
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(uri: string) {
  let jwks = jwksCache.get(uri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(uri), {
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000,
    });
    jwksCache.set(uri, jwks);
  }
  return jwks;
}

export interface IdTokenClaims extends JWTPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  sub: string;
}

/** Verify an OIDC id_token signature + standard claims. */
export async function verifyIdToken(args: {
  provider: SocialProvider;
  idToken: string;
  clientId: string;
  expectedNonce: string | null;
}): Promise<IdTokenClaims> {
  const endpoints = PROVIDER_ENDPOINTS[args.provider];
  if (!endpoints.oidc || !endpoints.jwksUri || !endpoints.issuer) {
    throw new Error(`[${args.provider}] is not configured for id_token verification`);
  }
}
const jwks = getJwks(endpoints.jwksUri);
const {payload} = await jwtVerify(args.idToken, jwks, {
issuer: endpoints.issuer,
audience: args.clientId,
});
if (args.expectedNonce && payload.nonce !== args.expectedNonce) {
throw new Error(`[${args.provider}] id_token nonce mismatch`);
}
return payload as IdTokenClaims;
}

/** Generic userinfo fetcher (used as a fallback or when no id_token is available). */
export async function fetchUserinfo(
provider: SocialProvider,
accessToken: string,
): Promise<Record<string, unknown>> {
const endpoints = PROVIDER_ENDPOINTS[provider];
const res = await fetch(endpoints.userinfoEndpoint, {
headers: {Authorization: `Bearer ${accessToken}`}, Accept: "application/json"},
});
if (!res.ok) {
throw new Error(`[${provider}] userinfo failed: HTTP ${res.status}`);
}
return (await res.json()) as Record<string, unknown>;
}

function asString(v: unknown): string | null {
return typeof v === "string" && v.length > 0 ? v : null;
}

function asBool(v: unknown): boolean | null {
if (typeof v === "boolean") return v;
if (v === "true") return true;
if (v === "false") return false;
return null;
}

/**
 * Normalize provider-specific responses into the OIDC-style NormalizedProfile.
 * Always fetches userinfo for Facebook (no id_token); for OIDC providers we
 * prefer id_token claims and fall back to userinfo for missing fields.
 */
export async function normalizeProfile(args: {
provider: SocialProvider;
accessToken: string;
idClaims: IdTokenClaims | null;
}): Promise<NormalizedProfile> {
const {provider, accessToken, idClaims} = args;

if (provider === "facebook") {
const u = await fetchUserinfo(provider, accessToken);
const picture = u.picture as {data?: {url?: string}} || undefined;
const id = asString(u.id);
if (!id) throw new Error("[facebook] userinfo missing id");
const composed =
asString(u.name) ?? 
([asString(u.first_name), asString(u.last_name)].filter(Boolean).join(" ")) || null;
return {
provider,
providerUserId: id,
email: asString(u.email),
// Facebook does not surface email_verified; treat email as verified
// when present, since Facebook itself requires confirmation to set one.
emailVerified: asString(u.email) ? true : null,
name: composed,
avatarUrl: asString(picture?.data?.url),
};
}

// OIDC providers: prefer id_token claims, top-up missing fields from userinfo.
const claims = (idClaims ?? {}) as IdTokenClaims & Record<string, unknown>;
const needFallback =
!claims.email || !claims.name || !claims.picture || claims.email_verified === undefined;

let info: Record<string, unknown> = {};
if (needFallback) {
try {
info = await fetchUserinfo(provider, accessToken);
} catch {
// userinfo failure is non-fatal if id_token already had what we need.
info = {};
}
}

const sub = asString(claims.sub) ?? asString(info.sub);
if (!sub) throw new Error(`[${provider}] could not derive providerUserId`);

const email = asString(claims.email) ?? asString(info.email);
const emailVerified =
claims.email_verified !== undefined
? asBool(claims.email_verified)
: asBool(info.email_verified);

const composed =
[
asString(claims.given_name) ?? asString(info.given_name),
asString(claims.family_name) ?? asString(info.family_name),
]
.filter(Boolean)
.join(" ") || null;
const name = asString(claims.name) ?? asString(info.name) ?? composed;

const avatarUrl = asString(claims.picture) ?? asString(info.picture);
return {provider, providerUserId: sub, email, emailVerified, name, avatarUrl};
}