/**
 * Authentication + role helpers shared by every serverless handler.
 *
 * - signToken / verifyToken: stateless JWT (HS256, 7-day default).
 * - extractToken: returns just the JWT payload (cheap, no DB read).
 * - requireUser: loads the full user document, enforces isActive
 *               and the per-user `tokenInvalidatedAt` checkpoint,
 *               and returns the user or writes the proper error.
 * - requireAdmin: same as requireUser but also checks role === "admin".
 */
import jwt from "jsonwebtoken";
import { type Document, ObjectId, type WithId } from "mongodb";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "./db.js";
import type {UserRole} from "@upcat/shared";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRY = (process.env.JWT_EXPIRY || "7d") as jwt.SignOptions["expiresIn"];

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    /** Issued-at timestamp in seconds (filled in automatically by jsonwebtoken). */
    iat?: number;
}

export interface AuthedUser extends Document {
    _id: ObjectId;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    isVerified: boolean;
    tokenInvalidatedAt?: Date;
}

export function signToken(payload: Omit<JwtPayload, "iat">): string {
    return jwt.sign(payload, JWT_SECRET, {expiresIn: JWT_EXPIRY});
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function extractToken(req: VercelRequest): JwtPayload | null {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer.")) return null;
    try {
        const decoded = verifyToken(header.slice(7));
        // Backwards-compat: tokens issued before role was added default to reviewee.
        if (!decoded.role) decoded.role = "reviewee";
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Loads the full user document for the request. Writes 401/403 to `res`
 * and returns null on failure -- callers should `return` immediately.
 */
export async function requireUser(
    req: VercelRequest,
    res: VercelResponse,
): Promise<WithId<AuthedUser> | null> {
    const payload = extractToken(req);
    if (!payload) {
        res.status(401).json({success: false, error: "Unauthorized"});
        return null;
    }
    const db = await getDb();
    const user = (await db
        .collection("users")
        .findOne({ _id: new ObjectId(payload.userId)})) as WithId<AuthedUser> | null;

    if (!user) {
        res.status(401).json({success: false, error: "Unauthorized"});
        return null;
    }
    if (user.isActive === false) {
        res.status(403).json({success: false, error: "Account is deactivated."});
        return null;
    }
    const issuedAtMs = (payload.iat ?? 0) * 1000;
    if (
        user.tokenInvalidatedAt &&
        issuedAtMs && 
        issuedAtMs < new Date(user.tokenInvalidatedAt).getTime()
    ) {
        res.status(401).json({success: false, error: "Session expired. Please sign in again."});
        return null;
    }
    return user;
}

/** Wraps requireUser and additionally enforces the admin role. */
export async function requireAdmin(
    req: VercelRequest,
    res: VercelResponse,
): Promise<WithId<AuthedUser> | null> {
    const user = await requireUser(req, res);
    if (!user) return null;
if (user.role !== "admin") {
    res.status(403).json({success: false, error:"Access denied. Admins only."});
    return null;
}
return user;
}