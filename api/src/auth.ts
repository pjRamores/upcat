/**
 * Authentication + role helpers shared by every serverless handler.
 *
 * - signToken / verifyToken: stateless JWT (HS256, 7-day default).
 * - extractToken: returns just the JWT payload (cheap, no DB read).
 * - requireUser: loads the full user document, enforces isActive
 * and the per-user `tokenInvalidatedAt` checkpoint,
 * and returns the user or writes the proper error.
 * - requireAdmin: same as requireUser but also checks role === "admin".
 */
import jwt from "jsonwebtoken";
import { type Document, ObjectId, type WithId } from "mongodb";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./db.js";
import type { UserRole } from "@upcat/shared";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRY = (process.env.JWT_EXPIRY || "7d") as jwt.SignOptions["expiresIn"];
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[(LOG_LEVEL as LogLevel) || "info"];
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

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
  log("debug", "Signing JWT", {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  log("debug", "Verifying JWT");
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function extractToken(req: VercelRequest): JwtPayload | null {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    log("warn", "Missing or invalid authorization header", {
      hasHeader: Boolean(header),
    });
    return null;
  }

  try {
    const decoded = verifyToken(header.slice(7));

    // Backwards-compat: tokens issued before role was added default to reviewee.
    if (!decoded.role) {
      decoded.role = "reviewee";
      log("info", "JWT missing role, defaulting to reviewee", {
        userId: decoded.userId,
        email: decoded.email,
      });
    }

    log("debug", "JWT extracted successfully", {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    return decoded;
  } catch (error) {
    log("warn", "JWT verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });
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
    log("warn", "Unauthorized request: no valid token");
    res.status(401).json({ success: false, error: "Unauthorized" });
    return null;
  }

  try {
    const db = await getDb();
    const user = (await db
      .collection("users")
      .findOne({ _id: new ObjectId(payload.userId) })) as WithId<AuthedUser> | null;

    if (!user) {
      log("warn", "Unauthorized request: user not found", {
        userId: payload.userId,
        email: payload.email,
      });
      res.status(401).json({ success: false, error: "Unauthorized" });
      return null;
    }

    if (user.isActive === false) {
      log("info", "Blocked deactivated user", {
        userId: String(user._id),
        email: user.email,
      });
      res.status(403).json({ success: false, error: "Account is deactivated." });
      return null;
    }

    const issuedAtMs = (payload.iat ?? 0) * 1000;
    if (
      user.tokenInvalidatedAt &&
      issuedAtMs &&
      issuedAtMs < new Date(user.tokenInvalidatedAt).getTime()
    ) {
      log("info", "Rejected invalidated session", {
        userId: String(user._id),
        email: user.email,
        issuedAt: new Date(issuedAtMs).toISOString(),
        tokenInvalidatedAt: new Date(user.tokenInvalidatedAt).toISOString(),
      });
      res.status(401).json({ success: false, error: "Session expired. Please sign in again." });
      return null;
    }

    log("debug", "User authenticated successfully", {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    return user;
  } catch (error) {
    log("error", "Unexpected error in requireUser", {
      error: error instanceof Error ? error.message : String(error),
      userId: payload.userId,
      email: payload.email,
    });
    res.status(500).json({ success: false, error: "Internal server error" });
    return null;
  }
}

/** Wraps requireUser and additionally enforces the admin role. */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<WithId<AuthedUser> | null> {
  const user = await requireUser(req, res);
  if (!user) return null;

  if (user.role !== "admin") {
    log("warn", "Admin access denied", {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });
    res.status(403).json({ success: false, error: "Access denied. Admins only." });
    return null;
  }

  log("debug", "Admin authenticated successfully", {
    userId: String(user._id),
    email: user.email,
  });

  return user;
}
