import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import type { Db, ObjectId } from "mongodb";
import { LOGIN_LOCKOUT, XP_REWARDS } from "@upcat/shared";
import { getDb } from "../../src/db.js";
import { signTokenWithSession } from "../../src/security/sessions.js";
import { extractClientIp } from "../../src/security/requestContext.js";
import { logActivity } from "../../src/activityLog.js";
import { sendAccountLockedEmail } from "../../src/email.js";
import { awardXp, updateDailyStreak } from "../../src/gamification.js";
import { evaluateAchievements } from "../../src/achievements.js";
import { isPremiumActive, normalizeSubscription } from "../../src/subscription.js";
import {
  checkOnboardingTriggers,
  normalizeContextualPage,
  normalizeUserHelp,
} from "../../src/help.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

type LoginGamification = {
  xp: unknown[];
  achievements: unknown[];
  streakUpdated: unknown;
};

type OnboardingResult = {
  items: Array<{
    flowId: string;
    triggerCondition: string;
    reason: string;
  }>;
};

async function buildLoginGamification(db: Db, userId: ObjectId): Promise<LoginGamification> {
  const { info, firstOfDay } = await updateDailyStreak(db, userId);
  if (!firstOfDay) {
    return { xp: [], achievements: [], streakUpdated: info };
  }

  const award = await awardXp(db, userId, {
    reason: "daily_login",
    baseAmount: XP_REWARDS.DAILY_LOGIN,
    skipMultiplier: false,
  });

  const achievements = await evaluateAchievements(db, userId);
  return {
    xp: [award],
    achievements: Array.isArray(achievements) ? achievements : [],
    streakUpdated: info,
  };
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    const startedAt = Date.now();
    const clientIp = extractClientIp(req);
    const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;

    console.log("[auth/login] request:start", {
        method: req.method,
        ip: clientIp,
        userAgent: userAgent,
    });

    if (req.method !== "POST") {
        console.warn("[auth/login] rejected:method_not_allowed", {
            method: req.method,
            ip: clientIp,
        });
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }

    try {
        const { email, password } = req.body ?? {};
        if (!email || !password) {
            console.warn("[auth/login] rejected:missing_credentials", {
                ip: clientIp,
                hasEmail: Boolean(email),
                hasPassword: Boolean(password),
            });
            res.status(400).json({
                success: false,
                error: "Email and password are required.",
            });
            return;
        }

        const db = await getDb();
        const normalizedEmail = String(email).toLowerCase().trim();

        console.log("[auth/login] lookup:start", {
            email: normalizedEmail,
            ip: clientIp,
        });

        const user = await db.collection("users").findOne({ email: normalizedEmail });

        if (!user) {
            console.warn("[auth/login] rejected:user_not_found", {
                email: normalizedEmail,
                ip: clientIp,
                durationMs: Date.now() - startedAt,
            });
            res.status(401).json({ success: false, error: "Invalid credentials." });
            return;
        }

        if (user.isActive === false) {
            console.warn("[auth/login] rejected:inactive_user", {
                userId: String(user._id),
                email: normalizedEmail,
                ip: clientIp,
            });
            res.status(403).json({
                success: false,
                error: "Your account has been deactivated. Please contact support.",
            });
            return;
        }

        const existingLock = user.security?.loginAttempts?.lockedUntil as | Date | string | null | undefined;

        if (existingLock && new Date(existingLock).getTime() > Date.now()) {
            const isHard =
                new Date(existingLock).getTime() >=
                new Date(LOGIN_LOCKOUT.hardUntil).getTime() - 1000;

            console.warn("[auth/login] rejected:locked", {
                userId: String(user._id),
                email: normalizedEmail,
                ip: clientIp,
                lockedUntil: new Date(existingLock).toISOString(),
                hardLock: isHard,
            });

            res.status(423).json({
                success: false,
                error: isHard
                    ? "Account locked. Use account recovery to regain access."
                    : `Too many failed attempts. Try again after ${new Date(existingLock).toUTCString()}`,
            });
            return;
        }

        if (!user.isVerified) {
            console.warn("[auth/login] rejected:not_verified", {
                userId: String(user._id),
                email: normalizedEmail,
                ip: clientIp,
            });
            res.status(403).json({
                success: false,
                error: "Please verify your email before logging in.",
            });
            return;
        }

        const storedHash: string | null = user.auth?.passwordHash ?? user.passwordHash ?? null;
        if (!storedHash) {
            console.warn("[auth/login] rejected:no_password_set", {
                userId: String(user._id),
                email: normalizedEmail,
                ip: clientIp,
            });
            res.status(401).json({
                success: false,
                error: 'This account has no password set. Sign in with your linked social provider, or use "Forgot password" to set one.',
            });
            return;
        }

        const valid = await bcrypt.verify(String(password), storedHash);
        if (!valid) {
            const prevCount = Number(user.security?.loginAttempts?.count ?? 0);
            const nextCount = prevCount + 1;
            const newLock = lockedUntil(nextCount);

            console.warn("[auth/login] rejected:invalid_password", {
                userId: String(user._id),
                email: normalizedEmail,
                ip: clientIp,
                previousFailedCount: prevCount,
                nextFailedCount: nextCount,
                lockedUntil: newLock?.toISOString() ?? null,
            });

            await db.collection("users").updateOne(
                { _id: user._id },
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
                await sendAccountLockedEmail(String(user.email), {
                    unlockMinutes: minutes,
                    recoverUrl: `${APP_URL}/recover-account`,
                }).catch((err) => {
                    console.error("[auth/login] lock-email failed", {
                        userId: String(user._id),
                        email: normalizedEmail,
                        error: err instanceof Error ? err.message : err,
                    });
                return undefined;
                });
            }

            res.status(401).json({
                success: false,
                error: newLock
                    ? "Account temporarily locked due to too many failed attempts."
                    : "Invalid credentials.",
            });
            return;
        }

        const role = (user.role as "admin" | "reviewee" | undefined) ?? "reviewee";
        const now = new Date();

        console.log("[auth/login] success:password_verified", {
            userId: String(user._id),
            email: normalizedEmail,
            role,
            ip: clientIp,
        });

        void db
            .collection("users")
            .updateOne(
                { _id: user._id },
                {
                    $set: {
                        lastLoginAt: now,
                        updatedAt: now,
                        "security.loginAttempts.count": 0,
                        "security.loginAttempts.lockedUntil": null,
                    },
                    $inc: { loginCount: 1 },
                },
            )
            .catch((err) => {
                console.error("[auth/login] post-login user update failed", {
                    userId: String(user._id),
                    error: err instanceof Error ? err.message : err,
                });
                return undefined;
            });

            void logActivity(db, {
                actorId: user._id,
                actorRole: role,
                action: "user.login",
                targetType: "user",
                targetId: String(user._id),
                metadata: { email: user.email },
            }).catch((err) => {
                console.error("[auth/login] activity log failed", {
                userId: String(user._id),
                error: err instanceof Error ? err.message : err,
            });
            return undefined;
        });

        const [{ token }, gamification, onboarding] = await Promise.all([
            signTokenWithSession({
                userId: user._id,
                email: user.email,
                role,
                ip: clientIp,
                userAgent,
                fingerprint: (req.headers["x-device-fingerprint"] as string | undefined) ?? null,
            }),

            buildLoginGamification(db, user._id).catch((err) => {
                console.error("[auth/login] gamification update failed", {
                    userId: String(user._id),
                    error: err instanceof Error ? err.message : err,
                });
                return null;
            }),

            (async (): Promise<OnboardingResult> => {
                try {
                    const targetPage = role === "admin" ? "/admin" : "/dashboard";
                    const page = normalizeContextualPage(targetPage);
                    const userHelpNormalized = normalizeUserHelp((user as { help?: unknown }).help);

                    if (userHelpNormalized.helpPreferences.showOnboarding === false) {
                        return { items: [] };
                    }

                    const suggested: OnboardingResult["items"] = [];
                    const conventional = checkOnboardingTriggers(
                        user as unknown as {
                            help?: unknown;
                            gamification?: { xp?: number };
                            createdAt?: Date | string | null;
                        },
                        page,
                    );

                    if (conventional) {
                        suggested.push({
                            flowId: conventional,
                            triggerCondition: "policy",
                            reason: "rule_match",
                        });
                    }

                    return { items: suggested };
                } catch (err) {
                    console.error("[auth/login] onboarding check failed", {
                        userId: String(user._id),
                        error: err instanceof Error ? err.message : err,
                    });
                    return { items: [] };
                }
            })(),
        ]);

        const subscription = normalizeSubscription(user as Record<string, unknown>);

        console.log("[auth/login] response:success", {
            userId: String(user._id),
            email: normalizedEmail,
            role,
            premium: isPremiumActive(subscription),
            durationMs: Date.now() - startedAt,
        });

        try {
            const responseBody = {
                success: true,
                data: {
                    token: String(token),
                    user: {
                        _id: String(user._id),
                        email: user.email ?? null,
                        firstName: user.firstName ?? null,
                        lastName: user.lastName ?? null,
                        isVerified: Boolean(user.isVerified),
                        role,
                        isActive: user.isActive ?? true,
                        hasPassword: true,
                        socialOnly: false,
                        premium: isPremiumActive(subscription),
                        lastLoginAt: now.toISOString(),
                        loginCount: Number(user.loginCount ?? 0) + 1,
                        createdAt:
                        user.createdAt instanceof Date
                            ? user.createdAt.toISOString()
                            : user.createdAt ?? null,
                        updatedAt: now.toISOString(),
                    },
                },
            };

            const serialized = JSON.stringify(responseBody);
            console.log("[auth/login] response:serialized", serialized);
            res.status(200).send(serialized);
            return;
        } catch (err) {
            console.error("[auth/login] response serialization failed", err);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
            return;
        }

        // res.status(200).json({
        //     success: true,
        //     data: {
        //         token,
        //         user: {
        //             _id: user._id.toString(),
        //             email: user.email,
        //             firstName: user.firstName,
        //             lastName: user.lastName,
        //             isVerified: user.isVerified,
        //             role,
        //             isActive: user.isActive ?? true,
        //             hasPassword: true,
        //             socialOnly: false,
        //             subscription: subscription,
        //             premium: isPremiumActive(subscription),
        //             lastLoginAt: now.toISOString(),
        //             loginCount: Number(user.loginCount ?? 0) + 1,
        //             createdAt: user.createdAt,
        //             updatedAt: now,
        //         },
        //         gamification,
        //         onboarding,
        //     },
        // });
        // return;
    } catch (err) {
        console.error("[auth/login] fatal", {
            ip: clientIp,
            userAgent,
            error:
                err instanceof Error
                ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                }
                : err,
                durationMs: Date.now() - startedAt,
        });

        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
