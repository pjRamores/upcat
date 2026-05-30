/**
 * POST /api/auth/social/:provider/callback
 *
 * Body: { code: string, state: string }
 *
 * Validates the state, exchanges the authorization code for tokens, verifies
 * the OIDC id_token (where applicable), normalizes the profile, and either:
 * logs the user in (purpose=login), creating an account if needed; or
 * links the identity to the currently-authenticated user (purpose=link).
 *
 * Rewritten by vercel.json from /api/auth/social/:provider/callback ->
 * /api/functions/auth/social/callback?provider=:provider
 */

import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {getDb} from "../../src/db.js";
import {signTokenWithSession} from "../../src/security/sessions.js";
import {extractClientIp} from "../../src/security/requestContext.js";
import {logActivity} from "../../src/activityLog.js";
import {getClientSecret, getProviderConfig} from "../../src/oidc/settings.js";
import {isSupportedProvider, PROVIDER_ENDPOINTS} from "../../src/oidc/providers.js";
import {consumeOAuthState} from "../../src/oidc/state.js";
import {exchangeCode, type IdTokenClaims, normalizeProfile, verifyIdToken} from "../../src/oidc/exchange.js";
import {findIdentityByProvider, upsertIdentity} from "../../src/oidc/identities.js";
import {clientIp, rateLimit} from "../../src/oidc/rateLimit.js";

interface UserDoc {
  _id: ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  isActive: boolean;
  role?: "admin" | "reviewee";
  loginCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  passwordHash?: string;
  auth?: {hasPassword?: boolean; passwordHash?: string | null; tokenInvalidatedAt?: Date | null};
}

function userToDto(u: UserDoc, hasPassword: boolean): Record<string, unknown> {
  return {
    _id: u._id.toString(),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isVerified: u.isVerified,
    role: u.role ?? "reviewee",
    isActive: u.isActive ?? true,
    loginCount: u.loginCount ?? 0,
    hasPassword,
    socialOnly: !hasPassword,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function deriveNames(name: string | null, email: string | null): { first: string; last: string } {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0]!, last: "" };
    return { first: parts[0]!, last: parts.slice(1).join(" ") };
  }
  if (email) return { first: email.split("@")[0]!, last: "" };
  return { first: "Member", last: "" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const rl = rateLimit({
    bucket: "social-callback",
    key: clientIp(req),
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    return res.status(429).json({success: false, error: "Too many requests."});
  }

  const provider = (req.query.provider as string | undefined)?.toLowerCase();
  if (!isSupportedProvider(provider)) {
    return res.status(400).json({success: false, error: "Unsupported provider."});
  }

  const {code, state} = (req.body ?? {}).as { code?: string; state?: string };
  if (!code || !state) {
    return res.status(400).json({success: false, error: "Missing code or state."});
  }

  const db = await getDb();

  // // Validate state (atomic claim) ------------------------
  const stateDoc = await consumeOAuthState(db, state, provider);
  if (!stateDoc) {
    return res
      .status(400)
      .json({success: false, error: "This sign-in session has expired. Please try again."});
  }
}
// — Provider must still be enabled —
const cfg = await getProviderConfig(db, provider);
if (!cfg.enabled) {
  return res
  .status(403)
  .json({success: false, error: `Sign-in with ${provider} is currently disabled.`});
}
const clientSecret = getClientSecret(cfg);
if (!clientSecret || !cfg.clientId || !cfg.redirectUri) {
  return res
  .status(500)
  .json({success: false, error: `Provider ${provider} is misconfigured.`});
}

// — Exchange code -> tokens —
let tokens;
try {
  tokens = await exchangeCode({
    provider,
    code,
    codeVerifier: stateDoc.codeVerifier,
    clientId: cfg.clientId,
    clientSecret,
    redirectUri: cfg.redirectUri,
  });
} catch (err) {
  return res
  .status(400)
  .json({success: false, error: `[${provider}] missing id_token in response.`});
}

// — Verify id_token (OIDC) —
let idClaims: IdTokenClaims | null = null;
if (PROVIDER_ENDPOINTS[provider].oidc) {
  if (!tokens.id_token) {
    return res
    .status(400)
    .json({success: false, error: `[${provider}] missing id_token in response.`});
  }
  try {
    idClaims = await verifyIdToken({
      provider,
      idToken: tokens.id_token,
      clientId: cfg.clientId,
      expectedNonce: stateDoc.nonce,
    });
  } catch (err) {
    return res
    .status(400)
    .json({success: false, error: `[${provider}] id_token validation failed.`});
  void err;
}
}

// — Normalize profile —
let profile;
try {
  profile = await normalizeProfile({
    provider,
    accessToken: tokens.access_token,
    idClaims,
  });
} catch (err) {
  return res
  .status(400)
  .json({success: false, error: `[${provider}] id_token validation failed.`});
}

const users = db.collection<UserDoc>("users");

// —
// LINK FLOW
// —

if (stateDoc.purpose === "link") {
  if (!stateDoc.userId) {
    return res
    .status(400)
    .json({success: false, error: "Link flow is missing the target user."});
  }
  // If this identity already belongs to another user -> conflict.
  const existing = await findIdentityByProvider(db, provider, profile.providerUserId);
  if (existing && !existing.userId.equals(stateDoc.userId)) {
    return res.status(409).json({
      success: false,
      error: "This social account is already linked to a different user.",
    });
  }
  const me = await users.findOne({_id: stateDoc.userId});
  if (!me) return res.status(404).json({success: false, error: "User not found."});

  await upsertIdentity({
    db,
    userId: me._id,
    profile,
    tokens,
    isNewLink: !existing,
  });

  await logActivity(db, {
    actorId: me._id,
    actorRole: me.role ?? "reviwee",
    action: "auth.social_account_linked",
    targetType: "user",
    targetId: me._id,
  });
}
metadata: {provider, providerUserId: profile.providerUserId},
});

return res.status(200).json({success: true, data: {linked: true, provider}});
}

// -------------------------------------------------------------------------
// LOGIN FLOW
// -------------------------------------------------------------------------
let user: UserDoc | null = null;
let createdNew = false;

// 1. Find by existing identity (provider, sub).
const linkedExisting = await findIdentityByProvider(db, provider, profile.providerUserId);
if (linkedExisting) {
    user = await users.findOne({_id: linkedExisting.userId});
    if (!user) {
        // Orphaned identity — clean it up.
        await db.collection("user_identities")
            .deleteOne({_id: linkedExisting._id});
    }
}

// 2. Else try to match by verified email.
if (!user && profile.email) {
    const candidate = await users.findOne({email: profile.email.toLowerCase()});
    if (candidate) {
        if (candidate.isActive === false) {
            return res
                .status(403)
                .json({success: false, error: "Your account has been deactivated."});
        }
        if (!candidate.isVerified || !profile.emailVerified) {
            return res.status(409).json({
                success: false,
                error:
                    "An account with this email already exists but is unverified."
                +
                    "Please sign in with your password and verify your email first."
                +
                    "then link this provider from Settings.",
            });
        }
        user = candidate;
    }
}

// 3. Else create a brand-new user.
if (!user) {
    const email =
        profile.email?.toLowerCase() ?? `social-${provider}-${profile.providerUserId}@no-email.local`;
    const {first, last} = deriveNames(profile.name, profile.email);
    const now = new Date();
    const insert = await users.insertOne({
        _id: new ObjectId(),
        email,
        firstName: first,
        lastName: last,
        isVerified: profile.emailVerified === true,
        isActive: true,
        role: "reviewee",
        loginCount: 0,
        createdAt: now,
        updatedAt: now,
        auth: {hasPassword: false, passwordHash: null, tokenInvalidatedAt: null},
    } as UserDoc);
    user = await users.findOne({_id: insert.insertId});
    createdNew = true;
}

if (!user) {
    return res.status(500).json({success: false, error: "Could not establish account."});
}

// 4. Upsert identity row.
await upsertIdentity({db, userId: user._id, profile, tokens, isNewLink: !linkedExisting});

// 5. Update login bookkeeping.
const now = new Date();
await users.updateOne(
    {_id: user._id},
    {
        $set: {lastLoginAt: now, updatedAt: now},
        $inc: {loginCount: 1},
    },
);

await logActivity(db, {
    actorId: user._id,
    actorRole: user.role ?? "reviewee",
    action: createdNew ? "auth.social_signup_completed" : "auth.social_login_completed",
    targetType: "user",
    targetId: user._id,
    metadata: {provider, email: user.email},
});

const role = user.role ?? "reviewee";
const {token} = await signTokenWithSession({
    userId: user._id,
    email: user.email,
    role,
    ip: extractClientIp(req),
    userAgent: (req.headers["user-agent"]) as string | undefined) ?? null,
    fingerprint: (req.headers["x-device-fingerprint"]) as string | undefined) ?? null,
});
const hasPassword = !!(user.auth?.hasPassword || user.auth?.passwordHash || user.passwordHash);

return res.status(200).json({
success: true,
data: {
token,
user: userToDto({...user, role, lastLoginAt: now}) as UserDoc, hasPassword),
linkedProvider: provider,
newAccount: createdNew,
redirectPath: stateDoc.redirectPath,
},
});
}