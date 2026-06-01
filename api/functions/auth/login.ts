import type {VercelRequest, VercelResponse} from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import type {Db, ObjectId} from "mongodb";
import {LOGIN_LOCKOUT, XP_REWARDS} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {signTokenWithSession} from "../../src/security/sessions.js";
import {extractClientIp} from "../../src/security/requestContext.js";
import {logActivity} from "../../src/activityLog.js";
import {sendAccountLockedEmail} from "../../src/email.js";
import {awardXp, updateDailyStreak,} from "../../src/gamification.js";
import {evaluateAchievements} from "../../src/achievements.js";
import {isPremiumActive, normalizeSubscription,} from "../../src/subscription.js";
import {checkOnboardingTriggers, normalizeContextualPage, normalizeUserHelp,} from "../../src/help.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

/**
 * Updates the user's daily-activity streak and grants the daily-login XP
 * the first time a user logs in on any given UTC day. Subsequent logins
 * within the same day are no-ops. Returns the gamification payload for the
 * login response (or null if nothing happened).
 */
async function buildLoginGamification(db: Db, userId: ObjectId) {
  const {info, firstOfDay} = await updateDailyStreak(db, userId);
  if (!firstOfDay) {
    return {xp: [], achievements: [], streakUpdated: info};
  }
  const award = await awardXp(db, userId, {
    reason: "daily_login",
    baseAmount: XP_REWARDS.DAILY_LOGIN,
    skipMultiplier: false,
  });
  const achievements = await evaluateAchievements(db, userId);
  return {xp: [award], achievements, streakUpdated: info};
}

function lockedUntil(failedCount: number): Date | null {
  if (failedCount >= LOGIN_LOCKOUT.hardThreshold) {
    return new Date(LOGIN_LOCKOUT.hardUntil);
  }
  if (failedCount >= LOGIN_LOCKOUT.mediumThreshold) {
    return new Date(Date.now() + LOGIN_LOCKOUT.mediumDurationMs);
  }
  if (failedCount >= LOGIN_LOCKOUT.softThreshold) {
    return new Date(Date.now() + LOGIN_LOCKOUT.softDurationMs);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const {email, password} = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({success: false, error: "Email and password are required."});
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({email: email.toLowerCase().trim()});
  if (!user) {
    return res.status(401).json({success: false, error: "Invalid credentials."});
  }
  if (user.isActive === false) {
    return res.status(403).json({
      success: false,
      error: "Your account has been deactivated. Please contact support.",
    });
  }

  const existingLock = user.security?.loginAttempts?.lockedUntil as Date | null | undefined;
  if (existingLock && new Date(existingLock).getTime() > Date.now()) {
    const isHard =
      new Date(existingLock).getTime() >=
      new Date(LOGIN_LOCKOUT.hardUntil).getTime() - 1000;
    return res.status(423).json({
      success: false,
      error: isHard
    });
    ? "Account locked. Use account recovery to regain access."
    : "Too many failed attempts. Try again after ${new Date(existingLock).toUTCString()}.";
  }
  if (!user.isVerified) {
    return res
      .status(403)
      .json({success: false, error: "Please verify your email before logging in."});
  }

  const storedHash: string | null =
    user.auth?.passwordHash ?? user.passwordHash ?? null;
  if (!storedHash) {
    return res.status(401).json({
      success: false,
      error:
        'This account has no password set. Sign in with your linked social provider, or use "Forgot password" to set one.'
      });
    }
  const valid = await bcrypt.verify(password, storedHash);
  if (!valid) {
    const prevCount = Number(user.security?.loginAttempts?.count ?? 0);
    const nextCount = prevCount + 1;
const newLock = lockedUntil(nextCount);
await db.collection("users").updateOne(
  {_id: user._id},
  {
    $set: {
      "security.loginAttempts.count": nextCount,
      "security.loginAttempts.lastAttemptAt": new Date(),
      "security.loginAttempts.lockedUntil": newLock,
    },
  },
  );
if (
  prevCount < LOGIN_LOCKOUT.mediumThreshold &&
  nextCount >= LOGIN_LOCKOUT.mediumThreshold &&
  newLock
  ) {
    const minutes = Math.max(1, Math.round((newLock.getTime() - Date.now()) / 60_000));
    await sendAccountLockedEmail(user.email, {
      unlockMinutes: minutes,
      recoverUrl: `${APP_URL}/recover-account`,
    }).catch(() => undefined);
  }
  return res.status(401).json({
    success: false,
    error: newLock
    ? "Account temporarily locked due to too many failed attempts."
    : "Invalid credentials.",
  });
}

const role = (user.role as "admin" | "reviewee" | undefined) ?? "reviewee";
const now = new Date();

// Fire-and-forget bookkeeping (don't block the response) ------------------------
void db.collection("users").updateOne(
  {_id: user._id},
  {
    $set: {
      lastLoginAt: now,
      updatedAt: now,
      "security.loginAttempts.count": 0,
      "security.loginAttempts.lockedUntil": null,
    },
    $inc: {loginCount: 1},
  },
  ).catch(() => undefined);

void logActivity(db, {
  actorId: user._id,
  actorRole: role,
  action: "user.login",
  targetType: "user",
  targetId: user._id,
  metadata: {email: user.email},
}).catch(() => undefined);

// Run token signing, gamification, and onboarding in parallel ------------------------
const [{token}, gamification, onboarding] = await Promise.all([
  signTokenWithSession({
    userId: user._id,
    email: user.email,
    role,
    ip: extractClientIp(req),
    userAgent: (req.headers["user-agent"] as string | undefined) ?? null,
    fingerprint: (req.headers["x-device-fingerprint"] as string | undefined) ?? null,
  }),
  buildLoginGamification(db, user._id).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[auth/login] gamification update failed", err);
    return null;
  }),
  (async () => Promise<{ items: Array<{ flowId: string; triggerCondition: string; reason: string }> }> => {
    try {
      const targetPage = role === "admin" ? "/admin" : "/dashboard";
      const page = normalizeContextualPage(targetPage);
      const userHelpNormalized = normalizeUserHelp((user as { help?: unknown }).help);
      if (userHelpNormalized.helpPreferences.showOnboarding === false) {
        return {items: []};
      }
      const suggested = Array<{ flowId: string; triggerCondition: string; reason: string }> = [];
      const conventional = checkOnboardingTriggers(
        user as unknown as {
          help?: unknown;
          gamification?: {xp?: number};
          createdAt?: Date | string | null
        },
        page,
      );
      if (conventional) {
        suggested.push({flowId: conventional, triggerCondition: "policy", reason: "rule_match"});
      }
      return {items: suggested};
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[auth/login] onboarding check failed", err);
      return {items: []};
    }
  })(),
  ]);
```

return res.status(200).json({
  success: true,
data: {
  token,
  user: {
    _id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isVerified: user.isVerified,
    role,
    isActive: user.isActive ?? true,
    hasPassword: true,
    socialOnly: false,
    subscription: normalizeSubscription(user as Record<string, unknown>),
    premium: isPremiumActive(normalizeSubscription(user as Record<string, unknown>)),
    lastLoginAt: now.toISOString(),
    loginCount: (user.loginCount ?? 0) + 1,
    createdAt: user.createdAt,
    updatedAt: now,
  },
  gamification,
  onboarding,
},
});