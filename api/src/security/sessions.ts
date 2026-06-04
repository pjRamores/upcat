/**
 * Phase 15 - User session tracking.
 *
 * Every successful authentication mints a JWT with a unique 'jti' claim and inserts a matching row in 'user_sessions'. Sessions can be listed and revoked from the user's Settings page; revocation flips 'revoked: true' and (for "revoke all") bumps 'users.tokenInvalidatedAt' so older JWTs are rejected by requireUser().
 */
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { USER_SESSION_RETENTION_DAYS } from "@upcat/shared";
import {getDb} from "../db.js";
import {type JwtPayload, signToken} from "../auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface CreateSessionInput {
    userId: ObjectId;
    email: string;
    role: JwtPayload["role"];
    ip: string;
    userAgent: string | null;
    fingerprint: string | null;
    country?: string | null;
    city?: string | null;
}

/** Sign a JWT with a unique 'jti' and persist a 'user_sessions' row. */
export async function signTokenWithSession(input: CreateSessionInput): Promise<{
    token: string;
    jti: string;
    sessionId: ObjectId;
}> {
    const jti = new ObjectId().toHexString();
    const token = jwt.sign(
        {userId: input.userId.toString(), email: input.email, role: input.role, jti},
        JWT_SECRET,
        {expiresIn: (process.env.JWT_EXPIRY || "7d") as jwt.SignOptions["expiresIn"]},
    );
    const sessionId = new ObjectId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + USER_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    try {
        const db = await getDb();
        await db.collection("user_sessions").insertOne({
            _id: sessionId,
            userId: input.userId,
            jti,
            issuedAt: now,
            lastActiveAt: now,
            ip: input.ip,
            userAgent: input.userAgent,
            fingerprint: input.fingerprint,
            country: input.country ?? null,
            city: input.city ?? null,
            revoked: false,
            revokedAt: null,
        } as never);
    } catch {
        /* session bookkeeping is non-fatal. */
    }
    return {token, jti, sessionId};
}

/** Fire-and-forget refresh of lastActiveAt -- called from middleware. */
export async function touchSession(jti: string): Promise<void> {
    if (!jti) return;
    try {
        const db = await getDb();
        await db
            .collection("user_sessions")
            .updateOne({jti, revoked: false}, {$set: {lastActiveAt: new Date()}});
    } catch {
        /* non-fatal. */
    }
}

/** Mark a single session revoked. Returns true when the row existed and was owned by 'userId'. */
export async function revokeSession(jti: string, userId: ObjectId): Promise<boolean> {
    const db = await getDb();
    const r = await db
        .collection("user_sessions")
        .updateOne(
            {jti, userId, revoked: false},
            {$set: {revoked: true, revokedAt: new Date()}},
        );
    return r.modifiedCount > 0;
}

/** Mark every session for the user as revoked (except optionally the current one). */
export async function revokeAllSessions(
    userId: ObjectId,
    exceptJti: string | null = null,
): Promise<number> {
    const db = await getDb();
    const filter: Record<string, unknown> = {userId, revoked: false};
    if (exceptJti) filter.jti = {$ne: exceptJti};
    const r = await db
        .collection("user_sessions")
        .updateMany(filter, {$set: {revoked: true, revokedAt: new Date()}});
    // Also bump tokenInvalidatedAt so older non-jti tokens are rejected.
    await db
.collection("users")
.updateOne({_id: userId}, {$set:{tokenInvalidatedAt: new Date()}});
return r.modifiedCount;
}

/**
 * Return the JTI claim from an Authorization header, if any.
 */
export function extractJti(authHeader: string | undefined): string | null {
    if (!authHeader?.startsWith("Bearer ")) return null;
    try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as JwtPayload & { jti?: string };
        return decoded.jti ?? null;
    } catch {
        return null;
    }
}

// Re-export the plain signToken for callers that don't want session tracking.
export {signToken};