export type UserRole = "admin" | "reviewee";

export interface User {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
    role: UserRole;
    isActive: boolean;

    /**
     * Premium-tier user flag. When true, ad placements and video interstitials
     * are suppressed across the app. Currently unused until a paid tier launches,
     * but already wired through the auth payload so future ad logic can read it
     * without a schema migration.
     */
    premium?: boolean;
    subscription?: UserSubscription;
    lastLoginAt?: string | null;
    loginCount?: number;
    deactivatedAt?: string | null;
    deactivatedBy?: string | null;
    notes?: string | null;
    /** Whether this user has set a local password (separate from social login). */
    hasPassword?: boolean;
    /** True when the user signed in via a social provider on the most recent login. */
    socialOnly?: boolean;
    /** Account security flags surfaced to the client. */
    security?: {
        hasRecoveryCodes: boolean;
        recoveryCodesGeneratedAt: string | null;
        hasSecurityQuestions: boolean;
        lastPasswordChangeAt: string | null;
        lockedUntil: string | null;
    };
    /** Outstanding data export / deletion requests for the user. */
    dataRequests?: {
        lastExportAt: string | null;
        pendingDeletionId: string | null;
    };
    /** Phase-12 gamification block (populated for every user; defaults written on first read). */
    gamification?: UserGamificationBlock;
    createdAt: string;
    updatedAt: string;
}

export interface UserGamificationBlock {
    xp: number;
    level: number;
    title: string;
    streak: {
        current: number;
        longest: number;
        lastActiveDate: string | null;
        multiplier: number;
    };
    achievements: {
        /** Unlocked catalog ids. */
        unlocked: string[];
        /** Progress map for achievements that track a counter (catalogId -> currentValue). */
        progress: Record<string, number>;
        /** Total achievement points awarded. */
        points: number;
        /** Achievements unlocked but not yet acknowledged by the user (for celebration UI). */
        pendingNotification: string[];
    };
    weeklyChallenge?: {
        challengeId: string;
        assignedAt: string;
        expiresAt: string;
        progress: number;
        target: number;
        completed: boolean;
        completedAt: string | null;
        rewardClaimed: boolean;
    } | null;
    stats: {
        examsCompleted: number;
        perfectScores: number;
        questionsAnswered: number;
        correctAnswers: number;
        practiceSessions: number;
        totalStudyMinutes: number;
        lastActiveAt: string | null;
    };
}

export type SocialProvider = "google" | "linkedin" | "facebook";

/**
 * Provider-agnostic identity claims (always normalized to OIDC-style fields,
 * even for non-OIDC providers like Facebook).
 */
export interface NormalizedProfile {
    provider: SocialProvider;
    providerUserId: string;
    email: string | null;
    emailVerified: boolean | null;
    name: string | null;
    avatarUrl: string | null;
}

export interface LinkedAccount {
    provider: SocialProvider;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    linkedAt: string;
    lastLoginAt: string | null;
}
export interface PublicAuthProvider {
    enabled: boolean;
    clientId: string | null;
}
export type PublicAuthProviders = Record<SocialProvider, PublicAuthProvider>;
export interface AdminAuthProviderConfig {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    hasSecret: boolean;
    redirectUri: string;
    scopes: string[];
    linkedUsers: number;
    logins7d: number;
}
export type AdminAuthProviders = Record<SocialProvider, AdminAuthProviderConfig>;
export interface SocialStartResponse {
    authorizationUrl: string;
    state: string;
}
export interface SocialCallbackLoginResponse {
    token: string;
    user: User;
    linkedProvider: SocialProvider;
    newAccount: boolean;
}
export interface SocialCallbackLinkResponse {
    linked: true;
    provider: SocialProvider;
}
export interface DeleteAccountPayload {
    /** Required: user must type the exact phrase to confirm. */
    confirmation: string;
    /** Required when the user has a local password. */
    password?: string;
}
export interface GenerateRecoveryCodesResponse {
    codes: string[];
    message: string;
    generatedAt: string;
}
export interface RecoveryCodesStatus {
    hasRecoveryCodes: boolean;
    generatedAt: string | null;
    unusedCount: number;
    totalCount: number;
}
export interface RecoveryVerifyPayload {
    email: string;
    recoveryCode: string;
}
export interface RecoveryVerifyResponse {
    recoveryToken: string;
    expiresInSeconds: number;
}
export interface RecoverAccountPayload {
    action: "reset_password" | "set_password";
    newPassword: string;
    confirmNewPassword: string;
}
export interface SecurityQuestionEntry {
    question: string;
    answer: string;
}
export interface SetSecurityQuestionsPayload {
    questions: SecurityQuestionEntry[];
}
export interface SecurityQuestionsPublicResponse {
    /** The three questions the user picked (no answers). */
    questions: string[];
}
export interface VerifySecurityQuestionsPayload {
    email: string;
    answers: {
        questionIndex: number;
        answer: string;
    }[];
}
export type SupportTicketType = "account_recovery" | "identity_dispute" | "data_export" | "data_deletion" | "account_merge" | "general_support";
export type SupportTicketStatus = "open" | "in_progress" | "awaiting_user" | "resolved" | "rejected";
export type SupportTicketPriority = "low" | "medium" | "high" | "critical";
export type SupportTicketVerificationMethod = "email_otp" | "security_questions" | "document_upload" | "admin_override";
export type SupportTicketVerificationStatus = "pending" | "verified" | "failed";
export interface SupportTicketMessage {
    _id: string;
    sender: "user" | "admin" | "system";
    senderName: string;
    content: string;
    createdAt: string;
    isInternal: boolean;
}
export interface SupportTicketVerification {
    method: SupportTicketVerificationMethod;
    status: SupportTicketVerificationStatus;
    verifiedAt: string | null;
    verifiedBy: string | null;
    attempts: number;
    evidence: {
        type: string;
        description: string;
        uploadedAt: string;
        fileRef: string | null;
    }[];
}
export interface SupportTicketResolution {
    action: string | null;
    notes: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
}

export interface SupportTicket {
    _id: string;
    ticketNumber: string;
    userId: string | null;
    requesterEmail: string;
    type: SupportTicketType;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
    subject: string;
    description: string;
    verification: SupportTicketVerification;
    resolution: SupportTicketResolution;
    messages: SupportTicketMessage[];
    assignedTo: string | null;
    assignedToName?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSupportTicketPayload {
    type: SupportTicketType;
    subject: string;
    description: string;
    priority?: SupportTicketPriority;
}

export interface CreateGuestSupportTicketPayload extends CreateSupportTicketPayload {
    email: string;
    fullName: string;
    captchaToken: string;
    captchaAnswer: string;
    /** Honeypot -- bots fill it, humans don't. */
    website?: string;
}

export interface PostTicketMessagePayload {
    content: string;
    isInternal?: boolean;
}

export interface UpdateTicketStatusPayload {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    assignedTo?: string | null;
    resolution?: {
        action?: string;
        notes?: string;
    };
}

export interface SupportDashboardSummary {
    open: number;
    inProgress: number;
    awaitingUser: number;
    avgResolutionHours: number;
    ticketsToday: number;
    ticketsThisWeek: number;
    byType: Record<SupportTicketType, number>;
    byPriority: Record<SupportTicketPriority, number>;
    unassigned: number;
    oldestOpenTicket: {
        ticketNumber: string;
        createdAt: string;
        subject: string;
    } | null;
    resolutionTrend: {
        date: string;
        opened: number;
        resolved: number;
    }[];
    recent: {
        id: string;
        ticketNumber: string;
        subject: string;
        type: SupportTicketType;
        status: SupportTicketStatus;
        priority: SupportTicketPriority;
        createdAt: string;
    }[];
}

export interface CaptchaChallenge {
    token: string;
    question: string;
    expiresAt: string;
}

export type DataRequestType = "export" | "deletion";
export type DataRequestStatus = "pending" | "processing" | "ready" | "completed" | "failed" | "cancelled";
export type ExportFormat = "json" | "csv";

export interface DataExportOptions {
    format: ExportFormat;
    includeExamHistory: boolean;
    includeStats: boolean;
    includePersonalInfo: boolean;
    includeActivityLog: boolean;
}

export type DeletionScope = "full" | "data_only";

export interface DataRequest {
    _id: string;
    userId: string;
    type: DataRequestType;
    status: DataRequestStatus;
}
format: ExportFormat;
includeExamHistory: boolean;
includeStats: boolean;
includePersonalInfo: boolean;
includeActivityLog: boolean;
fileUrl: string | null;
fileSizeBytes: number | null;
generatedAt: string | null;
expiresAt: string | null;

};
deletion?: {
    scope: DeletionScope;
    retainAnonymizedStats: boolean;
    confirmedAt: string | null;
    scheduledFor: string | null;
    executedAt: string | null;
    cancelledAt: string | null;
    cancelledBy: "user" | "admin" | null;
};
requestedAt: string;
updatedAt: string;
processedBy: string | null;

}
export interface CreateDeletionRequestPayload {
    scope: DeletionScope;
    retainAnonymizedStats: boolean;
    password?: string;
}

export type IdentityDisputeStatus = "open" | "investigating" | "resolved_for_claimant" | "resolved_for_owner" | "rejected";
export type IdentityDisputeAction = "transfer_identity" | "reject_claim" | "remove_identity";

export interface IdentityDisputeEvidence {
    type: string;
    description: string;
    fileRef: string | null;
}

export interface IdentityDispute {
    _id: string;
    supportTicketId: string;
    claimantUserId: string | null;
    claimantEmail: string;
    disputedProvider: SocialProvider;
    disputedProviderUserId: string;
    currentOwnerUserId: string;
    status: IdentityDisputeStatus;
    evidence: {
        claimant: IdentityDisputeEvidence[];
        owner: IdentityDisputeEvidence[];
    };
    adminDecision: {
        decidedBy: string | null;
        decidedAt: string | null;
        reasoning: string | null;
        action: IdentityDisputeAction | null;
    };
    createdAt: string;
    updatedAt: string;

}
export type AccountMergeStrategy = "keep_primary_data" | "merge_all";

export interface MergeAccountsPayload {
    primaryUserId: string;
    secondaryUserId: string;
    mergeStrategy: AccountMergeStrategy;
    adminPassword: string;
}

export interface MergeAccountsResponse {
    merged: true;
    primaryUserId: string;
    deletedUserId: string;
    movedIdentities: number;
    movedExamSessions: number;
    movedContactMessages: number;
}

export type DeletionType = "user_requested" | "admin_initiated" | "inactivity";

export interface DeletionLogEntry {
    _id: string;
    originalUserId: string;
    emailHash: string;
    deletionType: DeletionType;
    dataRequestId: string | null;
    executedAt: string;
    executedBy: string | null;
    dataDestroyed: string[];
    dataRetained: string[];
    ipAddress: string | null;
}

export interface AuthResponse {
    token: string;
    user: User;
    gamification?: null | { xp?: unknown[]; achievements?: unknown[]; streakUpdated?: unknown };
    onboarding?: { items: Array<{ flowId: string; triggerCondition: string; reason: string }>; } | null;
}

export interface RegisterPayload {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface ForgotPasswordPayload {
    email: string;
}
export interface ResetPasswordPayload {
    token: string;
    newPassword: string;
    confirmNewPassword: string;
}

export interface VerifyEmailPayload {
    token: string;
}

export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordValidation {
    isValid: boolean;
    strength: PasswordStrength;
    errors: string[];
}

export type SubjectArea = "Language Proficiency" | "Mathematics" | "Science" | "Reading Comprehension";
export type Difficulty = "easy" | "medium" | "hard" | "very_hard";
export type QuestionType = "multiple_choice" | "passage_based";
export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface QuestionChoice {
    label: "A" | "B" | "C" | "D";
    text: string;
}

export interface Passage {
    id: string;
    title: string;
    content: string;
    source: string;
    subjectArea: SubjectArea;
    createdAt: string;
}

export interface Question {
    _id: string;
    subjectArea: SubjectArea;
    subtopic: string;
    difficulty: Difficulty;
    type: QuestionType;
    passageId: string | null;
    questionText: string;
    choices: QuestionChoice[];
    correctAnswer: "A" | "B" | "C" | "D";
    rationale: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

/**
 * Question payload sent to client during an exam (no answer / rationale).
 */
export type ExamQuestion = Omit<Question, "correctAnswer" | "rationale">;

export interface SessionConfig {
    totalQuestions: number;
    distribution: Record<SubjectArea, number>;
    difficultyMix: {
        easy: number;
        medium: number;
        hard: number;
        very_hard: number;
    };
    timeLimit: number;
}

export interface SessionQuestionEntry {
    questionId: string;
    orderIndex: number;
    userAnswer: string | null;
    isIncorrect: boolean | null;
    answeredAt: string | null;
    timeSpent: number | null;
}

export interface SubjectScore {
    correct: number;
    total: number;
    percentage: number;
}

export interface SessionScore {
    total: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    percentage: number;
    bySubject: Record<SubjectArea, SubjectScore>;
}

export interface ExamSession {
    _id: string;
    userId: string;
    status: SessionStatus;
    config: SessionConfig;
    questions: SessionQuestionEntry[];
    score?: SessionScore;
    startedAt: string;
    completedAt: string | null;
    createdAt: string;
}

export interface UserStats {
    totalExams: number;
    averageScore: number;
    bestScore: number;
    subjectBreakdown: Record<SubjectArea, {
        attempts: number;
        averageScore: number;
    }>;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface StartExamResponse {
    sessionId: string;
    totalQuestions: number;
    timeLimit: number;
    startedAt: string;
}

export interface StartExamPayload {
    totalQuestions?: number;
    distribution?: Partial<Record<SubjectArea, number>>;
    difficultyMix?: {
        easy?: number;
        medium?: number;
        hard?: number;
        very_hard?: number;
    };
    timeLimit?: number;
}

export interface PaginatedQuestionsResponse {
    questions: ExamQuestion[];
    currentPage: number;
    totalPages: number;
    totalQuestions: number;
}

export interface SubmitAnswerPayload {
    questionId: string;
    answer: "A" | "B" | "C" | "D" | null;
    timeSpent?: number;
}

export interface BulkAnswerPayload {
    answers: SubmitAnswerPayload[];
}

export interface ReviewQuestion extends Question {
    userAnswer: "A" | "B" | "C" | "D" | null;
    isCorrect: boolean;
    timeSpent: number | null;
    passage?: Passage | null;
}

export interface ReviewResponse {
    session: ExamSession;
    questions: ReviewQuestion[];
}

export interface SessionSummary {
    _id: string;
    status: SessionStatus;
    startedAt: string;
    completedAt: string | null;
    totalQuestions: number;
    percentage: number | null;
}

export type FlagReason = "incorrect_answer" | "typo" | "unclear" | "other";
export type FlagStatus = "open" | "resolved" | "dismissed";
export type AnnouncementType = "info" | "warning" | "maintenance";

export interface QuestionFlag {
    _id: string;
    questionId: string;
    userId: string;
    userEmail?: string;
    reason: FlagReason;
    comment: string;
    status: FlagStatus;
    resolutionNote?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    createdAt: string;
}

export interface Announcement {
    _id: string;
    title: string;
    message: string;
    type: AnnouncementType;
    isActive: boolean;
    startsAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    createdBy?: string;
}

export interface PlatformSettings {
    examDefaults: {
        distribution: Record<SubjectArea, {
            questions: number;
            timeLimit: number;
        }>;
        difficultyMix: {
            easy: number;
            medium: number;
            hard: number;
            very_hard: number;
        };
    };
    registration: {
        isOpen: boolean;
        requireEmailVerification: boolean;
    };
    leaderboard: {
        isEnabled: boolean;
        showFullName: boolean;
    };
    maintenance: {
        isEnabled: boolean;
        message: string;
    };
    contact: {
        developerEmail: string;
    }
}
maxMessagesPerHour: number;
};
/**
 * Optional ad-system overrides. When omitted, the server returns
 * `DEFAULT_ADS_SETTINGS` merged with env-derived defaults (publisher.id).
 */
ads?: import("./ads.js").AdsSettings;

export interface ActivityLogEntry {
    _id: string;
    actorId: string | null;
    actorRole: UserRole | "system";
    action: string;
    targetType: string;
    targetId: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface AdminDashboardSummary {
    users: {
        total: number;
        active: number;
        verified: number;
        unverified: number;
        newToday: number;
        newThisWeek: number;
        newThisMonth: number;
    };
    questions: {
        total: number;
        bySubject: Record<string, number>;
        byDifficulty: Record<string, number>;
        flagged: number;
        recentlyAdded: number;
    };
    exams: {
        totalSessions: number;
        completedToday: number;
        completedThisWeek: number;
        averageScore: number;
        averageCompletionRate: number;
        activeRightNow: number;
    };
    platform: {
        uptime: string;
        lastSeedDate: string | null;
        totalPassages: number;
        openContactMessages: number;
    };
}

export interface AdminUserListEntry {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    examCount: number;
    averageScore: number | null;
    lastExamDate: string | null;
}

export interface AdminQuestionListEntry {
    _id: string;
    subjectArea: SubjectArea;
    subtopic: string;
    difficulty: Difficulty;
    type: QuestionType;
    questionTextPreview: string;
    correctAnswer: "A" | "B" | "C" | "D";
    flagCount: number;
    usageCount: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export type XpReason = "exam_completed" | "exam_correct_bonus" | "exam_score_80" | "exam_score_90" | "exam_perfect" | "exam_perfect_subject" | "first_exam" | "daily_login" | "review_all_incorrect" | "practice_completed" | "practice_correct" | "achievement_unlocked" | "weekly_challenge" | "admin_grant";

export interface XpTransaction {
    _id: string;
    userId: string;
    amount: number;
    baseAmount: number;
    multiplier: number;
    reason: XpReason;
    description: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface LevelInfo {
    level: number;
    title: string;
    xp: number;
    xpForCurrent: number;
    xpForNext: number;
}
xpToNextLevel: number;
progressPct: number;
}
export interface StreakInfo {
current: number;
longest: number;
lastActiveDate: string | null;
multiplier: number;
/** Days remaining until streak breaks at midnight UTC (0 means already today) */
hoursUntilExpiry: number | null;
}
export type AchievementCategory = "milestone" | "performance" | "streak" | "dedication" | "mastery" | "social";
export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
/** Declarative condition evaluated server-side against User + counters. */
export type AchievementCondition = {
kind: "examCount";
gte: number;
} | {
kind: "perfectScores";
gte: number;
} | {
kind: "scoreThreshold";
gte: number;
count: number;
} | {
kind: "streakDays";
gte: number;
} | {
kind: "totalXp";
gte: number;
} | {
kind: "levelReached";
gte: number;
} | {
kind: "questionsAnswered";
gte: number;
} | {
kind: "correctAnswers";
gte: number;
} | {
kind: "practiceSessions";
gte: number;
} | {
kind: "perfectSubject";
subject: string;
gte: number;
} | {
kind: "studyMinutes";
gte: number;
} | {
kind: "consecutiveDailyLogins";
gte: number;
};
export interface AchievementDef {
_id: string;
id: string;
category: AchievementCategory;
rarity: AchievementRarity;
title: string;
description: string;
icon: string;
xpReward: number;
points: number;
condition: AchievementCondition;
/** Whether the achievement should be hidden until unlocked. */
hidden: boolean;
/** When false, achievement isn't evaluated. */
isActive: boolean;
createdAt: string;
updatedAt: string;
}
export interface UserAchievement extends AchievementDef {
unlocked: boolean;
unlockedAt: string | null;
progress: number;
target: number;
progressPct: number;
}
export type WeeklyChallengeMetric = "exams_completed" | "questions_correct" | "study_minutes" | "practice_sessions" | "perfect_scores" | "score_above_threshold";
export interface WeeklyChallengeDef {
_id: string;
id: string;
title: string;
description: string;
metric: WeeklyChallengeMetric;
target: number;
/** Optional metric threshold (e.g. score >= 85 for score_above_threshold). */
threshold?: number;
xpReward: number;
isActive: boolean;
weight: number;
createdAt: string;
updatedAt: string;
}
export interface ActiveWeeklyChallenge {
challenge: WeeklyChallengeDef;
assignedAt: string;
expiresAt: string;
progress: number;
target: number;
progressPct: number;
completed: boolean;
completedAt: string | null;
rewardClaimed: boolean;
msUntilExpiry: number;
}
export interface GamificationProfile {
    level: LevelInfo;
    streak: StreakInfo;
    stats: UserGamificationBlock["stats"];
    achievementsSummary: {
        unlocked: number;
        total: number;
        points: number;
        pendingNotification: string[];
    };
    weeklyChallenge: ActiveWeeklyChallenge | null;
    recentXp: XpTransaction[];
}
export interface XpAwardResult {
    awarded: number;
    base: number;
    multiplier: number;
    reason: XpReason;
    previousXp: number;
    newXp: number;
    previousLevel: number;
    newLevel: number;
    leveledUp: boolean;
    newTitle: string;
}
export interface AchievementUnlockEvent {
    achievementId: string;
    title: string;
    description: string;
    rarity: AchievementRarity;
    icon: string;
    xpAwarded: number;
    points: number;
    unlockedAt: string;
}
/**
 * Returned from exam/submit, practice/complete, and login when applicable.
 */
export interface GamificationReward {
    xp: XpAwardResult[];
    achievements: AchievementUnlockEvent[];
    weeklyChallengeProgress?: {
        challengeId: string;
        progress: number;
        target: number;
        completed: boolean;
    } | null;
    streakUpdated?: StreakInfo | null;
}
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    avatarInitials: string;
    level: number;
    title: string;
    xp: number;
    streak: number;
    achievements: number;
    isCurrentUser: boolean;
}
export interface LeaderboardResponse {
    scope: "weekly" | "monthly" | "all_time";
    entries: LeaderboardEntry[];
    currentUser: LeaderboardEntry | null;
    generatedAt: string;
}
export interface AdminGrantXpPayload {
    userId: string;
    amount: number;
    reason: string;
}
export interface AdminAchievementUpsertPayload {
    id: string;
    category: AchievementCategory;
    rarity: AchievementRarity;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    points: number;
    condition: AchievementCondition;
    hidden?: boolean;
    isActive?: boolean;
}
export interface AdminWeeklyChallengeUpsertPayload {
    id: string;
    title: string;
    description: string;
    metric: WeeklyChallengeMetric;
    target: number;
    threshold?: number;
    xpReward: number;
    weight?: number;
    isActive?: boolean;
}
export type PracticeCardStatus = "new" | "learning" | "review" | "mastered";
export type PracticeMode = "review" | "weak_areas" | "subject_focus" | "mixed" | "random";
export type PracticeRating = "again" | "hard" | "good" | "easy";
export interface PracticeCard {
    _id: string;
    userId: string;
    questionId: string;
    subjectArea: string;
}
status: PracticeCardStatus;
/** SM-2 ease factor (start 2.5, floor 1.3). */
easeFactor: number;
/** Interval to next review, in days. */
intervalDays: number;
/** SM-2 repetition counter (resets to 0 on lapse). */
repetitions: number;
/** UTC ISO timestamp the card is next due. */
nextReviewDate: string;
/** Last time the user answered this card (any rating). */
lastReviewedAt: string | null;
/** Number of times this card was answered correctly across all reviews. */
correctCount: number;
/** Number of times this card was answered incorrectly across all reviews. */
incorrectCount: number;
/** Number of times the user pressed "again" (lapses). */
lapses: number;
/** Total user-rated reviews on this card. */
totalReviews: number;
/** Where the card originated. */
source: 'exam_incorrect' | 'manual' | 'weak_area_seed';
createdAt: string;
updatedAt: string;

export interface PracticeStartPayload {
    mode: PracticeMode;
    /** Required when mode === "subject_focus". */
    subjectArea?: string;
    /** Max cards in the session (default 20). */
    maxQuestions?: number;
    /** New-cards limit (default 5). */
    newCardsLimit?: number;
}

export interface PracticeSessionCard {
    cardId: string;
    questionId: string;
    status: PracticeCardStatus;
    /** Indicates this card was *added* by this session (not previously known). */
    isNewIntroduction: boolean;
    /** Order presented to the user. */
    order: number;
    /** User's selected answer letter when answered. */
    userAnswer: string | null;
    /** True/false set once the answer is graded. */
    isCorrect: boolean | null;
    /** Rating the user submitted (again/hard/good/easy). */
    rating: PracticeRating | null;
    /** Seconds spent on the card. */
    timeSpent: number | null;
    /** SM-2 snapshot *before* the rating was applied. */
    preEaseFactor: number;
    preIntervalDays: number;
    preRepetitions: number;
    /** SM-2 snapshot *after* the rating was applied. */
    postEaseFactor: number | null;
    postIntervalDays: number | null;
    postRepetitions: number | null;
    postStatus: PracticeCardStatus | null;
    postNextReviewDate: string | null;
}

export interface PracticeSession {
    id: string;
    userId: string;
    mode: PracticeMode;
    subjectArea: string | null;
    config: {
        maxQuestions: number;
        newCardsLimit: number;
    };
    cards: PracticeSessionCard[];
    status: 'in_progress' | 'completed' | 'abandoned';
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    /** Aggregates filled in on completion. */
    totalAnswered: number;
    totalCorrect: number;
    accuracyPct: number | null;
}

export interface PracticeStartResponse {
    sessionId: string;
    mode: PracticeMode;
    subjectArea: string | null;
    cards: Array<{
        cardId: string;
        questionId: string;
        order: number;
        status: PracticeCardStatus;
        isNewIntroduction: boolean;
        /** Sanitized question payload (no correctAnswer / rationale). */
        question: {
            _id: string;
            subjectArea: SubjectArea;
            subtopic: string;
            difficulty: Difficulty;
            type: QuestionType;
            questionText: string;
            choices: QuestionChoice[];
            passage: {
                _id: string;
                title: string;
                content: string;
                subjectArea: SubjectArea;
            } | null;
        };
    }>;
}
export interface PracticeAnswerPayload {
    cardId: string;
    userAnswer: "A" | "B" | "C" | "D" | null;
    timeSpentSeconds?: number;
}
export interface PracticeAnswerResponse {
    cardId: string;
    isCorrect: boolean;
    correctAnswer: "A" | "B" | "C" | "D";
    rationale: string;
}
export interface PracticeRatePayload {
    cardId: string;
    rating: PracticeRating;
}
export interface PracticeRateResponse {
    cardId: string;
    status: PracticeCardStatus;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewDate: string;
}
export interface PracticeCompleteResponse {
    sessionId: string;
    totalAnswered: number;
    totalCorrect: number;
    accuracyPct: number;
    durationMs: number;
    gamification: GamificationReward;
}
export interface PracticeStatsResponse {
    totals: {
        cards: number;
        new: number;
        learning: number;
        review: number;
        mastered: number;
    };
    dueToday: number;
    dueThisWeek: number;
    retentionPct: number;
    totalReviews: number;
    bySubject: Array<{
        subjectArea: string;
        cards: number;
        mastered: number;
        accuracyPct: number;
        dueToday: number;
    }>;
    upcoming: Array<{
        date: string;
        count: number;
    }>;
    recentSessions: Array<{
        sessionId: string;
        mode: PracticeMode;
        completedAt: string;
        totalAnswered: number;
        accuracyPct: number;
        durationMs: number;
    }>;
}
export interface PracticeCardListEntry {
    cardId: string;
    questionId: string;
    subjectArea: string;
    status: PracticeCardStatus;
    nextReviewDate: string;
    intervalDays: number;
    easeFactor: number;
    correctCount: number;
    incorrectCount: number;
    lapses: number;
    questionPreview: string;
}
/** A single browser push endpoint registered for a user. */
export interface PushSubscriptionRecord {
    _id: string;
    userId: string;
    /** The full PushSubscription endpoint URL (unique per browser/device). */
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    /** UA string captured at subscribe-time for diagnostics. */
    userAgent: string | null;
    preferences: PushPreferences;
    /** Optional IANA TZ; used by cron to localize reminders. */
    timezone: string | null;
    /** 'HH:mm' 24-hour local time for the daily reminder. */
    reminderTime: string;
    createdat: string;
    lastUsedAt: string | null;
    /** Auto-pruned when the push service returns 404/410. */
    failureCount: number;
}
export interface PushPreferences {
  daily_reminder: boolean;
  streak_alert: boolean;
  achievement: boolean;
  weekly_challenge: boolean;
  announcement: boolean;
}
export declare const DEFAULT_PUSH_PREFERENCES: PushPreferences;
export interface PushSubscribePayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  timezone?: string;
  reminderTime?: string;
  preferences?: Partial<PushPreferences>;
}
export interface PushSubscribeResponse {
  subscriptionId: string;
  preferences: PushPreferences;
}
export interface PushPreferencesPayload {
  endpoint?: string;
  preferences?: Partial<PushPreferences>;
  reminderTime?: string;
  timezone?: string;
}
export interface PushPreferencesResponse {
  subscriptions: Array<{
    subscriptionId: string;
    endpoint: string;
    userAgent: string | null;
    preferences: PushPreferences;
    reminderTime: string;
    timezone: string | null;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
}
/**
 * Payload pushed to the SW; the SW renders this as a Notification.
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  /** Notification type — used for tag-based replacement and filtering. */
  type: import("./constants.js").PushNotificationType;
  /** Click destination (in-app path). */
  url?: string;
  /** Optional notification icon URL (defaults to app icon). */
  icon?: string;
  /** Optional badge icon URL. */
  badge?: string;
  /** Optional notification image (large hero). */
  image?: string;
  /** Misc metadata exposed to the SW click handler. */
  data?: Record<string, unknown>;
}
export interface PushBroadcastPayload {
  title: string;
  body: string;
  url?: string;
  type: import("./constants.js").PushNotificationType;
  /** Limit broadcast to a subset of users by role. */
  role?: "admin" | "reviewee";
}
export interface PushBroadcastResponse {
  attempted: number;
  delivered: number;
  failed: number;
  pruned: number;
}
export type SecuritySeverity = "low" | "medium" | "high" | "critical";
export type IpReputation = "trusted" | "neutral" | "suspicious" | "blocked";
export type BlockedEntityType = "ip" | "ip_range" | "fingerprint" | "email_domain" | "user_agent_pattern";
export type BlockSeverity = "soft" | "hard";
export type RateLimitScope = "ip" | "user" | "global";
export interface SecurityEventSource {
  ip: string;
  userId: string | null;
  userAgent: string | null;
  fingerprint: string | null;
  country: string | null;
}
export interface SecurityEventTarget {
  type: string | null;
  value: string | null;
}
export interface SecurityEventAction {
  taken: string | null;
  automated: boolean;
}
export interface SecurityEvent {
  _id: string;
  timestamp: string;
  type: string;
  severity: SecuritySeverity;
  source: SecurityEventSource;
  target: SecurityEventTarget;
  details: Record<string, unknown>;
  action: SecurityEventAction;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
notes: string | null;
}
export interface IpIntelligence {
    _id: string;
    reputation: IpReputation;
    threatScore: number;
    isKnownProxy: boolean;
    isKnownVPN: boolean;
    isKnownTor: boolean;
    isKnownDataCenter: boolean;
    country: string | null;
    asn: string | null;
    asnOrg: string | null;
    activity: {
        firstSeenAt: string;
        lastSeenAt: string;
        totalRequests: number;
        requestsToday: number;
        failedLoginsTotal: number;
        failedLoginsToday: number;
        accountsCreated: number;
        accountsCreatedToday: number;
        examSessionsStarted: number;
        flaggedActions: number;
    };
    fingerprints: string[];
    userAgents: string[];
    associatedUserIds: string[];
}
blocks: Array<{
    reason: string;
    blockedAt: string;
    expiresAt: string | null;
    blockedBy: "system" | string;
    lifted: boolean;
    liftedAt: string | null;
    liftedBy: string | null;
}>;
riskFactors: string[];
updatedAt: string;
}
export interface BlockedEntity {
    _id: string;
    type: BlockedEntityType;
    value: string;
    reason: string;
    severity: BlockSeverity;
    blockedBy: "system" | string;
    blockedAt: string;
    expiresAt: string | null;
    isActive: boolean;
    metadata: {
        hitCount: number;
        lastHitAt: string | null;
        associatedEvents: string[];
    };
}
export interface EndpointLimitConfig {
    perIp?: {
        perMinute?: number;
        perHour?: number;
        perDay?: number;
    };
    perUser?: {
        perMinute?: number;
        perHour?: number;
        perDay?: number;
    };
}
export interface SecurityConfig {
    _id: "global";
    rateLimits: {
        global: {
            requestsPerSecond: number;
            burstLimit: number;
        };
        perIp: {
            requestsPerMinute: number;
            requestsPerHour: number;
            requestsPerDay: number;
        };
        perUser: {
            requestsPerMinute: number;
            requestsPerHour: number;
        };
    endpoints: Record<string, EndpointLimitConfig>;
};
botDetection: {
    enabled: boolean;
    captchaThreshold: number;
    blockThreshold: number;
    honeypotEnabled: boolean;
    fingerprintingEnabled: boolean;
    behavioralAnalysisEnabled: boolean;
};
dos: {
    enabled: boolean;
    globalRpsThreshold: number;
    perIpSpikeMultiplier: number;
    slowlorisTimeout: number;
    maxConcurrentPerIp: number;
    maxRequestBodySize: number;
    maxUrlLength: number;
};
anomalyDetection:
enabled: boolean;
impossibleTravelEnabled: boolean;
impossibleTravelThresholdKm: number;
impossibleTravelThresholdMin: number;
unusualHoursEnabled: boolean;
newDeviceAlertEnabled: boolean;
};
autoResponse: {
    autoBlockEnabled: boolean;
    autoBlockDuration: number;
    escalationThresholds: {
        softBlock: number;
        hardBlock: number;
        permanentBlock: number;
    };
    notifyAdminOnCritical: boolean;
    cooldownPeriod: number;
};
headers: {
    hsts: {
        enabled: boolean;
        maxAge: number;
        includeSubDomains: boolean;
    };
    csp: {
        defaultSrc: string[];
        scriptSrc: string[];
        styleSrc: string[];
        imgSrc: string[];
        connectSrc: string[];
        fontSrc: string[];
        frameSrc: string[];
        objectSrc: string[];
        baseUri: string[];
    };
    xFrameOptions: string;
    xContentTypeOptions: string;
    referrerPolicy: string;
    permissionsPolicy: string;
};
lockdown: {
    enabled: boolean;
    enabledAt: string | null;
    enabledBy: string | null;
    reason: string | null;
};
updatedAt: string;
updatedBy: string | null;
}
export interface UserSession {
    _id: string;
    userId: string;
    jti: string;
    issuedAt: string;
    lastActiveAt: string;
    ip: string;
    userAgent: string | null;
    fingerprint: string | null;
    country: string | null;
    city: string | null;
    revoked: boolean;
    revokedAt: string | null;
}
export type CaptchaType = "math" | "image" | "puzzle" | "pow";
export interface CaptchaImageOption {
    id: string;
    svg: string;
}
export interface CaptchaMathChallenge {
    question: string;
}
export interface CaptchaImageChallenge {
    prompt: string;
    options: CaptchaImageOption[];
}
export interface CaptchaPuzzleChallenge {
    backgroundSvg: string;
    piecesSvg: string;
    /** Y-coordinate of the puzzle slot (the user slides horizontally). */
    pieceY: number;
    /** Total slider width in pixels (display sizing for the client). */
    trackWidth: number;
    pieceSize: number;
}
export interface CaptchaPowChallenge {
    challenge: string;
    difficulty: number;
}
export interface CaptchaChallengePayload {
    captchaId: string;
    type: CaptchaType;
    expiresAt: string;
    challenge: CaptchaMathChallenge | CaptchaImageChallenge | CaptchaPuzzleChallenge | CaptchaPowChallenge;
}
export interface CaptchaVerifyPayload {
    captchaId: string;
    answer: unknown;
    /** Optional: time elapsed (ms) on the client between challenge + submit. */
    elapsedMs?: number;
}
export interface CaptchaVerifyResponse {
    valid: boolean;
    /** Signed JWT (10-min expiry) - pass back as `X-Captcha-Token` on the gated request. */
    token: string | null;
}
/**
 * When invalid, optional escalated challenge for the next attempt...
 */
nextType?: CaptchaType;

export type SubscriptionTier = "free" | "premium";
export type PaymentType = "free" | "manual" | "pangmeryenda";
export type FeatureAccessLevel = "all" | "premium" | "disabled";
export type FeatureCategory = "exams" | "practice" | "analytics" | "social" | "content" | "experience";
export type FeatureLimitPeriod = "daily" | "weekly" | "monthly" | "total";
export type PaymentSource = "manual_payment" | "pangmeryenda" | "admin_grant" | "promo_code";

export interface PremiumPlan {
    id: string;
    name: string;
    duration: number;
    isLifetime: boolean;
    price: number;
    currency: "PHP";
    originalPrice: number | null;
    description: string;
    isPopular: boolean;
    isActive: boolean;
    features: string[];
    order: number;
}

export interface ManualPaymentChannel {
    id: string;
    name: string;
    type: "ewallet" | "bank";
    icon: string;
    enabled: boolean;
    accountName: string;
    accountNumber: string;
    bankName: string | null;
    qrCodeImage: string | null;
    qrCodeLabel: string | null;
    limits: {
        daily: {
            max: number | null;
            current: number;
            lastResetDate: string;
        };
        monthly: {
            max: number | null;
            current: number;
            lastResetMonth: string;
        };
    };
    autoDisabled: boolean;
    autoDisabledReason: string | null;
    autoDisabledAt: string | null;
    additionalNotes: string | null;
    order: number;
}

export interface FeatureGateConfig {
    id: string;
    name: string;
    description: string;
    category: FeatureCategory;
    accessLevel: FeatureAccessLevel;
    hasLimit: boolean;
    limits: {
        free: number | null;
        premium: number | null;
    } | null;
    limitPeriod: FeatureLimitPeriod | null;
}

export interface PaymentConfig {
    _id: "global";
    activePaymentType: PaymentType;
    plans: PremiumPlan[];
    manual: {
        processingTimeMessage: string;
        instructionsHeader: string;
        instructionsBody: string;
        autoDisableThreshold: number;
        channels: ManualPaymentChannel[];
    };
    pangmeryenda: {
        enabled: boolean;
        apiBaseUrl: string;
        apiKey: string | null;
        apiSecretEnc: string | null;
        webhookSecret: string | null;
        merchantId: string | null;
        planMapping: Array<{
            planId: string;
            pangmeryendaProductId: string;
            pangmeryendaAmount: number;
        }>;
        successRedirectUrl: string;
        failureRedirectUrl: string;
        cancelRedirectUrl: string;
        webhookEndpoint: string;
    };
    featureGating: {
        features: FeatureGateConfig[];
    };
    updatedAt: string;
    updatedby: string | null;
}

export interface UserSubscription {
    tier: SubscriptionTier;
    premium: {
        startDate: string;
        endDate: string | null;
}
isLifetime: boolean;
planId: string;
source: PaymentSource;
grantedBy: string | null;
autoRenew: boolean;
history: Array<{
    startDate: string;
    endDate: string | null;
    planId: string;
    source: string;
    paymentId: string | null;
    grantedBy: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
}> | null;
usage: Record<string, {
    count: number;
    period: string;
    lastUsedAt: string;
}>;
}
export type PaymentSubmissionStatus = "pending" | "reviewing" | "approved" | "rejected" | "expired";
export interface PaymentSubmission {
    id: string;
    submissionNumber: string;
    userId: string;
    planId: string;
    planName: string;
    amount: number;
    currency: "PHP";
    channel: string;
    channelName: string;
    referenceNumber: string;
    screenshot: {
        url: string;
        filename: string;
        mimeType: string;
        uploadedAt: string;
        fileSize: number;
    };
    senderName: string | null;
    senderNumber: string | null;
    notes: string | null;
    status: PaymentSubmissionStatus;
    review: {
        reviewedBy: string | null;
        reviewedAt: string | null;
        decision: "approved" | "rejected" | null;
        rejectionReason: string | null;
        adminNotes: string | null;
    };
    subscriptionGranted: {
        startDate: string | null;
        endDate: string | null;
        applied: boolean;
    };
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}
export interface PangMeryendaTransaction {
    id: string;
    userId: string;
    planId: string;
    pangmeryendaTransactionId: string;
    pangmeryendaPaymentUrl: string | null;
    amount: number;
    currency: "PHP";
    status: "initiated" | "pending" | "completed" | "failed" | "cancelled" | "refunded";
    webhookReceived: boolean;
    webhookReceivedAt: string | null;
    webhookPayload: Record<string, unknown> | null;
    webhookVerified: boolean;
    subscriptionGranted: {
        startDate: string | null;
        endDate: string | null;
        applied: boolean;
    };
    errorMessage: string | null;
    retryCount: number;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
}
export interface PromoCode {
    id: string;
    code: string;
    type: "premium_grant" | "discount" | "extended_trial";
    grant: {
        planId: string | null;
        durationDays: number | null;
        discountPercent: number | null;
        discountAmount: number | null;
    };
    maxUses: number | null;
    currentUses: number;
    maxUsesPerUser: number;
    isActive: boolean;
    validFrom: string;
    validUntil: string | null;
    restrictToNewUsers: boolean;
    usedBy: Array<{
        userId: string;
usedAt: string;
submissionId: string | null;
createdAt: string;
createdBy: string;
}
export interface FeatureAccessResult {
tier: SubscriptionTier;
features: Record<string, {
accessible: boolean;
limit: number | null;
used: number;
remaining: number | null;
period: string | null;
upgradeRequired: boolean;
}>;
}
export interface SubscriptionStatusResponse {
tier: SubscriptionTier;
isPremium: boolean;
isLifetime: boolean;
startDate: string | null;
endDate: string | null;
daysRemaining: number | null;
planName: string | null;
source: string | null;
isExpiringSoon: boolean;
renewalOptions: PremiumPlan[];
history: UserSubscription["premium"] extends {
history: infer H;
} ? H : never;
}