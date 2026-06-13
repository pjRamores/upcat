/**
 * Phase 13 - Spaced Repetition Practice API wrappers.
 *
 * Returns the unwrapped `data` payload from the server envelope,
 * matching the convention used by gamificationApi/accountApi.
 */
import apiClient from "@/lib/api";
import {
  API_ROUTES_V12,
  type PracticeAnswerResponse,
  type PracticeCardListEntry,
  type PracticeCardStatus,
  type PracticeCompleteResponse,
  type PracticeMode,
  type PracticeRateResponse,
  type PracticeRating,
  type PracticeStartPayload,
  type PracticeStartResponse,
  type PracticeStatsResponse,
} from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await p;
  return data.data;
}

export interface PracticeStartResult
  extends Omit<PracticeStartResponse, "sessionId"> {
  /** Server may indicate "no cards available" with sessionId = null. */
  sessionId: string | null;
  message?: string;
}

export const practiceApi = {
  start: (payload: PracticeStartPayload) =>
    unwrap<PracticeStartResult>(
      apiClient.post(API_ROUTES_V12.PRACTICE.START, payload),
    ),

  answer: (
    sessionId: string,
    cardId: string,
    userAnswer: "A" | "B" | "C" | "D" | null,
    timeSpentSeconds?: number,
  ) =>
    unwrap<PracticeAnswerResponse>(
      apiClient.post(API_ROUTES_V12.PRACTICE.ANSWER(sessionId), {
        cardId,
        userAnswer,
        timeSpentSeconds,
      }),
    ),

  rate: (sessionId: string, cardId: string, rating: PracticeRating) =>
    unwrap<PracticeRateResponse>(
      apiClient.post(API_ROUTES_V12.PRACTICE.RATE(sessionId), {
        cardId,
        rating,
      }),
    ),

  complete: (sessionId: string) =>
    unwrap<PracticeCompleteResponse & { alreadyCompleted?: boolean }>(
      apiClient.post(API_ROUTES_V12.PRACTICE.COMPLETE(sessionId)),
    ),

  stats: () =>
    unwrap<PracticeStatsResponse>(
      apiClient.get(API_ROUTES_V12.PRACTICE.STATS),
    ),

  cards: (opts?: {
    page?: number;
    limit?: number;
    status?: PracticeCardStatus;
    subjectArea?: string;
    search?: string;
  }) =>
    unwrap<{
      cards: PracticeCardListEntry[];
      page: number;
      limit: number;
      totalPages: number;
      total: number;
    }>(
      apiClient.get(API_ROUTES_V12.PRACTICE.CARDS, {
        params: opts,
      }),
    ),

  bootstrap: (count: number) =>
    unwrap<{
      cardsAdded: number;
      cardsExisted: number;
      totalGenerated: number;
    }>(
      apiClient.post(API_ROUTES_V12.PRACTICE.BOOTSTRAP, { count }),
    ),
};

export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  review: "Review Due",
  weak_areas: "Weak Areas",
  subject_focus: "Subject Focus",
  mixed: "Mixed",
  random: "Just Random",
};

export const PRACTICE_MODE_DESCRIPTIONS: Record<PracticeMode, string> = {
  review: "Only cards that are due right now. Best for daily upkeep.",
  weak_areas:
    "Targets your two lowest-accuracy subjects with due cards + a few new ones.",
  subject_focus: "Restrict practice to a single subject of your choosing.",
  mixed: "Due cards plus fresh ones to keep your deck moving.",
  random:
    "Anytime practice — pull random cards from your entire deck. Perfect for quick sessions.",
};

export const PRACTICE_RATING_LABELS: Record<PracticeRating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export const PRACTICE_RATING_HINTS: Record<PracticeRating, string> = {
  again: "I forgot — show me again soon.",
  hard: "I got it, but it was a struggle.",
  good: "Recalled with some effort.",
  easy: "Effortless — push it out further.",
};
