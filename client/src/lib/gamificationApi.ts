/**
 * Phase 12 — Gamification API wrappers.
 *
 * All endpoints return the unwrapped `data` payload from the server envelope
 * (matching the convention used by accountApi/supportApi). The shared
 * apiClient already sets baseURL to "/api", so route constants here are
 * passed in their raw form (e.g. "/gamification/profile").
 */
import apiClient from "@/lib/api";
import {
  type ActiveWeeklyChallenge,
  API_ROUTES_V12,
  type GamificationProfile,
  type LeaderboardResponse,
  type LeaderboardScope,
  type UserAchievement,
} from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await p;
  return data.data;
}

export const gamificationApi = {
  profile: () =>
    unwrap<GamificationProfile>(
      apiClient.get(API_ROUTES_V12.GAMIFICATION.PROFILE),
    ),
    achievements: () =>
      unwrap<UserAchievement[]>(
        apiClient.get(API_ROUTES_V12.GAMIFICATION.ACHIEVEMENTS),
      ),
    leaderboard: (scope: LeaderboardScope => "weekly") =>
      unwrap<LeaderboardResponse>(
        apiClient.get(API_ROUTES_V12.GAMIFICATION.LEADERBOARD, {
          params: {scope},
        }),
      ),
    weeklyChallenge: () =>
      unwrap<ActiveWeeklyChallenge | null>(
        apiClient.get(API_ROUTES_V12.GAMIFICATION.WEEKLY_CHALLENGE),
      ),
    dismissNotifications: (achievementIds?: string[]) =>
      unwrap<{ dismissed: number }>(
        apiClient.post(API_ROUTES_V12.GAMIFICATION.DISMISS_NOTIFICATIONS, {
          achievementIds,
        }),
      ),
};

export const adminGamificationApi = {
  overview: () =>
    unwrap<
      {
        usersCount: number;
        activeUsers: number;
        achievementsCount: number;
        challengesCount: number;
        xpTransactions: number;
        totalXpAwarded: number;
      }>(apiClient.get(API_ROUTES_V12.ADMIN.GAMIFICATION),

    grantXp: (userId: string, amount: number, reason: string) =>
      apiClient.post(API_ROUTES_V12.ADMIN.GAMIFICATION_GRANT_XP, {
        userId,
        amount,
        reason,
      }),
    listAchievements: () =>
      unwrap<Array<Record<string, unknown>>>(
        apiClient.get(API_ROUTES_V12.ADMIN.GAMIFICATION_ACHIEVEMENTS),
      ),
    seedAchievements: () =>
      apiClient.post(
        `${API_ROUTES_V12.ADMIN.GAMIFICATION_ACHIEVEMENTS}?seed=true`,
      ),
    upsertAchievement: (body: Record<string, unknown>) =>
      apiClient.post(API_ROUTES_V12.ADMIN.GAMIFICATION_ACHIEVEMENTS, body),

    deactivateAchievement: (id: string) =>
      apiClient.delete(API_ROUTES_V12.ADMIN.GAMIFICATION_ACHIEVEMENT(id)),
    listChallenges: () =>
      unwrap<Array<Record<string, unknown>>>(
        apiClient.post(API_ROUTES_V12.ADMIN.GAMIFICATION_CHALLENGES),
      ),
    upsertChallenge: (body: Record<string, unknown>) =>
      apiClient.post(API_ROUTES_V12.ADMIN.GAMIFICATION_CHALLENGES, body),
};