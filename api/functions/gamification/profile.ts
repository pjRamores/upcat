/**
 * GET /api/gamification/profile
 *
 * Returns the authenticated user's gamification summary: level/XP/streak,
 * achievement counts (with pending-notification ids so the client can play
 * any celebration UI), the active weekly challenge, and the last 10 XP transactions.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {ensureGamification, levelInfoFromBlock, streakInfoFromBlock,} from "../../src/gamification.js";
import type {ActiveWeeklyChallenge, GamificationProfile, WeeklyChallengeDef, XpTransaction,} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const user = await requireUser(req, res);
    if (!user) return;

    const db = await getDb();
    const block = ensureGamification(user);

    // Recent XP feed
    const recent = (await db.collection("xp_transactions").find({userId: user._id.toHexString()}).sort({createdAt: -1}).limit(10).toArray()) as unknown as XpTransaction[];

    // Achievement counts
    const totalAchievements = await db.collection("Achievements_catalog").countDocuments({isActive: true});

    // Active weekly challenge
    let weeklyChallenge: ActiveWeeklyChallenge | null = null;
    if (block.weeklyChallenge?.challengeId) {
        const def = (await db.collection("weekly_challenges_catalog").findOne({id: block.weeklyChallenge.challengeId})) as WeeklyChallengeDef & { _id: { toHexString(): string } };
        if (def) {
            const expiresAt = new Date(block.weeklyChallenge.expiresAt);
            weeklyChallenge = {
                challenge: {
                    ...def,
                    id: def._id.toHexString(),
                    createdAt: typeof def.createdAt === "string" ? new Date(def.createdAt).toISOString() : undefined,
                    updatedAt: typeof def.updatedAt === "string" ? new Date(def.updatedAt).toISOString() : undefined,
                },
                assignedAt: block.weeklyChallenge.assignedAt,
                expiresAt: block.weeklyChallenge.expiresAt,
                progress: block.weeklyChallenge.progress,
                target: block.weeklyChallenge.target,
                progressPct:
                    block.weeklyChallenge.target > 0 ? Math.min(100, Math.round((block.weeklyChallenge.progress / block.weeklyChallenge.target) * 100)) : 0,
                completed: block.weeklyChallenge.completed,
                completedAt: block.weeklyChallenge.completedAt,
                rewardClaimed: block.weeklyChallenge.rewardClaimed,
                msUntilExpiry: Math.max(0, expiresAt.getTime() - Date.now()),
            };
        }
    }

    const profile: GamificationProfile = {
        level: levelInfoFromBlock(block),
        streak: streakInfoFromBlock(block),
        stats: block.stats,
        achievementsSummary: {
            unlocked: block.achievements.unlocked.length,
            total: totalAchievements,
            points: block.achievements.points,
            pendingNotification: block.achievements.pendingNotification,
        },
        weeklyChallenge,
        recentXp: recent,
    };

    return res.status(200).json({success: true, data: profile});
}