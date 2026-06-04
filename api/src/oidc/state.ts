/**
 * Server-side store for OAuth `state`, `nonce` and PKCE `code_verifier`.
 *
 * The codeVerifer is encrypted at rest so a partial DB leak doesn't allow an attacker to complete an in-flight code exchange.
 */
import crypto from "node:crypto";
import { type Db, ObjectId } from "mongodb";
import type { SocialProvider } from "@upcat/shared";
import { decrypt, encrypt } from "../encryption.js";

export type OAuthPurpose = "login" | "link";

export interface OAuthStateDoc {
    _id: ObjectId;
    state: string;
    nonce: string | null;
    codeVerifierEnc: string;
    provider: SocialProvider;
    userId: ObjectId | null;
    purpose: OAuthPurpose;
    redirectPath: string | null;
    createdAt: Date;
    expiresAt: Date;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function b64url(buf: Buffer): string {
    return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function randomState(): string {
    return b64url(crypto.randomBytes(32));
}

export function randomNonce(): string {
    return b64url(crypto.randomBytes(24));
}

/** RFC 7636 PKCE pair (code_verifier, code_challenge using S256). */
export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = b64url(crypto.randomBytes(48));
    const codeChallenge = b64url(crypto.createHash("sha256").update(codeVerifier).digest());
    return { codeVerifier, codeChallenge };
}

export async function createOAuthState(
    db: Db,
    args: {
        provider: SocialProvider;
        purpose: OAuthPurpose;
        userId: string | null;
        redirectPath: string | null;
        nonce: string | null;
        codeVerifier: string;
    },
): Promise<{ state: string }> {
    const state = randomState();
    const now = new Date();
    await db.collection<OAuthStateDoc>("oauth_state").insertOne({
        _id: new ObjectId(),
        state,
        nonce: args.nonce,
        codeVerifierEnc: encrypt(args.codeVerifier),
        provider: args.provider,
        userId: args.userId && ObjectId.isValid(args.userId) ? new ObjectId(args.userId) : null,
        purpose: args.purpose,
        redirectPath: args.redirectPath,
        createdAt: now,
        expiresAt: new Date(now.getTime() + TTL_MS),
    });
    return { state };
}

/**
 * Atomically claim an oauth_state record by its state string.
 * Returns the document with codeVerifier already decrypted, or null if not found / expired / already consumed.
 */
export async function consumeOAuthState(
    db: Db,
    state: string,
    provider: SocialProvider,
): Promise<OAuthStateDoc & { codeVerifier: string } | null> {
    const col = db.collection<OAuthStateDoc>("oauth_state");
    const doc = await col.findOneAndDelete({ state, provider });
    if (!doc) return null;
    if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) return null;
    let codeVerifier: string;
    try {
        codeVerifier = decrypt(doc.codeVerifierEnc);
    } catch {
        return null;
    }
    return { ...doc, codeVerifier };
}