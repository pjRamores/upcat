/**
 * POST /api/auth/social/:provider/start
 *
 * Initiates the Authorization Code + PKCE flow:
 * 1. Looks up the provider config (must be enabled).
 * 2. Generates state, nonce (OIDC), code_verifier + S256 challenge.
 * 3. Persists the state record (10-minute TTL, one-shot).
 * 4. Returns the authorization URL the SPA should redirect the user to.
 *
 * Body: {purpose: "login" | "link", redirectPath?: string}
 * - purpose=link requires a logged-in user.
 *
 * Rewritten by vercel.json from /api/auth/social/:provider/start ->
 * /api/functions/auth/social/start?provider=:provider
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../../src/db.js";
import {extractToken} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {getProviderConfig} from "../../src/oidc/settings.js";
import {isSupportedProvider, PROVIDER_ENDPOINTS} from "../../src/oidc/providers.js";
import {createOAuthState, generatePkcePair, type OAuthPurpose, randomNonce,} from "../../src/oidc/state.js";
import {clientIp, rateLimit} from "../../src/oidc/rateLimit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  // — Rate limit —

  const rl = rateLimit({
    bucket: "social-start",
    key: clientIp(req),
    limit: 10,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    return res.status(429).json({success: false, error: "Too many requests."});
  }

  // — Provider param —

  const provider = (req.query.provider as string | undefined)?.toLowerCase();
  if (!isSupportedProvider(provider)) {
    return res.status(400).json({success: false, error: "Unsupported provider."});
  }

  const body = (req.body ?? {}).as({
    purpose?: OAuthPurpose,
    redirectPath?: string,
  });
  const purpose: OAuthPurpose = body.purpose === "link" ? "link" : "login";

  // — Auth check for link flow —

  let userId: string | null = null;
  if (purpose === "link") {
    const payload = extractToken(req);
    if (!payload) {
      return res.status(401).json({success: false, error: "Sign-in to link a social account."});
    }
    userId = payload.userId;
  }

  // — Load config + sanity-check —

  const db = await getDb();
  const cfg = await getProviderConfig(db, provider);
  if (!cfg.enabled || !cfg.clientId || !cfg.clientSecretEnc || !cfg.redirectUri) {
    return res
      .status(403)
      .json({success: false, error: `Sign-in with ${provider} is not enabled right now.`});
  }

  // — Build state + PKCE —

  const endpoints = PROVIDER_ENDPOINTS[provider];
  const {codeVerifier, codeChallenge} = generatePkcePair();
  const nonce = endpoints.oidc ? randomNonce() : null;

  const safeRedirectPath =
    typeof body.redirectPath === "string" && body.redirectPath.startsWith("/")
    ? body.redirectPath.slice(0, 200)
    : null;

  const {state} = await createOAuthState(db, {
    provider,
    purpose,
    userId,
    redirectPath: safeRedirectPath,
    nonce,
    codeVerifier,
  });

  // — Build authorization URL —

  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(","),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  if (nonce) params.set("nonce", nonce);
  if (endpoints.extraAuthParams) {
    for (const [k, v] of Object.entries(endpoints.extraAuthParams)) params.set(k, v);
  }
}
script
const authorizationUrl = `${endpoints.authorizationEndpoint}?${params.toString()}`;

await logActivity(db, {
  actorId: userId,
  actorRole: userId ? "reviewee" : "system",
  action: "auth.social_login_started",
  targetType: "user",
  targetId: userId,
  metadata: {provider, purpose},
});

return res.status(200).json({success: true, data: {authorizationUrl, state}});
}