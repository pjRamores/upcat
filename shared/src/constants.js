script
export const SUBJECT_AREAS = [
    "Language Proficiency",
    "Mathematics",
    "Science",
    "Reading Comprehension"
];

export const SUBJECT_META = {
    "Language Proficiency": { label: "Language Proficiency", icon: "📖", color: "indigo" },
    "Mathematics": { label: "Mathematics", icon: ""math", color: "blue" },
    "Science": { label: "Science", icon: "🔬", color: "green" },
    "Reading Comprehension": { label: "Reading Comprehension", icon: "📚", color: "amber" }
};

export const DIFFICULTIES = ["easy", "medium", "hard", "very_hard"];
export const DIFFICULTY_LABELS = {
    easy: "Easy",
    medium: "Moderate",
    hard: "Hard",
    very_hard: "Very Hard"
};
export const DIFFICULTY_DESCRIPTIONS = {
    easy: "Basic / Recall: definitions, facts, and simple one-step problems.",
    medium: "Application: familiar concepts with a few steps.",
    hard: "Advanced / Analysis: multi-step reasoning, topic combinations, and edge cases.",
    very_hard: "Expert / Synthesis: novel situations, derivations, optimization, and non-routine problems."
};

export const DEFAULT_EXAM_CONFIG = {
    totalQuestions: 100,
    distribution: {
        "Language Proficiency": 25,
        Mathematics: 30,
        Science: 25,
        "Reading Comprehension": 20
    },
    difficultyMix: { easy: 25, medium: 40, hard: 25, very_hard: 10 },
    timeLimit: 180 // minutes
};

export const PASSING_PERCENTAGE = .60;
export const PASSWORD_MIN_LENGTH = 8;
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
export const RESET_TOKEN_EXPIRY_HOURS = 1;

export const PASSWORD_RULES = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true
};

export const API_ROUTES = {
    AUTH: {
        REGISTER: "/auth/register",
        LOGIN: "/auth/login",
        VERIFY_EMAIL: "/auth/verify-email",
        ME: "/auth/me",
        FORGOT_PASSWORD: "/auth/forgot-password",
        RESET_PASSWORD: "/auth/reset-password",
        PROVIDERS: "/auth/providers",
        SOCIAL_START: (provider) => `/auth/social/${provider}/start`,
        SOCIAL_CALLBACK: (provider) => `/auth/social/${provider}/callback`,
        LINKED_ACCOUNTS: "/auth/linked-accounts",
        UNLINK: "/auth/unlink",
        SET_PASSWORD: "/auth/set-password",
        RECOVERY_CODES_GENERATE: "/auth/recovery-codes/generate",
        RECOVERY_CODES_STATUS: "/auth/recovery-codes/status",
        RECOVERY_CODES_VERIFY: "/auth/recovery-codes/verify",
        RECOVER_ACCOUNT: "/auth/recover-account",
        SECURITY_QUESTIONS_SET: "/auth/security-questions/set",
        SECURITY_QUESTIONS_LOOKUP: "/auth/security-questions/lookup",
        SECURITY_QUESTIONS_VERIFY: "/auth/security-questions/verify"
    },
    ACCOUNT: "/account",
    ACCOUNT_EMAIL_PREFERENCES: "/account/email-preferences",
    ACCOUNT_DATA_EXPORT: "/account/data-export",
    ACCOUNT_DATA_EXPORT_ID: (id) => `/account/data-export/${id}`,
    ACCOUNT_DATA_EXPORT_DOWNLOAD: (id) => `/account/data-export/${id}/download`,
    ACCOUNT_DELETION_REQUEST: "/account/deletion-request",
    ACCOUNT_DELETION_REQUEST_CONFIRM: (id) => `/account/deletion-request/${id}/confirm`,
    ACCOUNT_DELETION_REQUEST_CANCEL: (id) => `/account/deletion-request/${id}/cancel`
},
SUPPORT: {
    TICKETS: "/support/tickets",
    TICKET: (n) => `/support/tickets/${n}`,
    TICKET_MESSAGES: (n) => `/support/tickets/${n}/messages`,
    GUEST: "/support/tickets/guest",
    CAPTCHA: "/support/captcha"
},
EXAM: {
    START: "/exam/start",
    SESSIONS: "/exam/sessions",
    QUESTIONS: (id) => `/exam/${id}/questions`,
    ANSWER: (id) => `/exam/${id}/answer`,
    ANSWER_BULK: (id) => `/exam/${id}/answer-bulk`,
    SUBMIT: (id) => `/exam/${id}/submit`,
    REVIEW: (id) => `/exam/${id}/review`
},
STATS: {
    OVERVIEW: "/stats/overview",
    SUBJECT_BREAKDOWN: "/stats/subject-breakdown",
    DIFFICULTY_BREAKDOWN: "/stats/difficulty-breakdown",
    PROGRESS: "/stats/progress-over-time",
    WEAK_AREAS: "/stats/weak-areas",
    LEADERBOARD: "/stats/leaderboard",
    /** @deprecated kept for the dashboard quick-stats card */
    SUMMARY: "/stats/summary"
},
CONTACT: "/contact",
script
ANNOUNCEMENTS: "/announcements",
STATUS: "/status",
PAYMENT: {
    CONFIG: "/payment/config",
    MANUAL_SUBMIT: "/payment/manual/submit",
    MANUAL_SUBMISSIONS: "/payment/manual/submissions",
    MANUAL_SUBMISSION: (submissionNumber) => `/payment/manual/submissions/${submissionNumber}`,
    MANUAL_CANCEL: (submissionNumber) => `/payment/manual/submissions/${submissionNumber}/cancel`,
    PANGMERYENDA_INITIATE: "/payment/pangmeryenda/initiate",
    PANGMERYENDA_STATUS: (transactionId) => `/payment/pangmeryenda/status/${transactionId}`,
    PANGMERYENDA_WEBHOOK: "/payment/pangmeryenda/webhook",
    PANGMERYENDA_SUCCESS: "/payment/pangmeryenda/success",
    PANGMERYENDA_FAILED: "/payment/pangmeryenda/failed",
    PANGMERYENDA_CANCELLED: "/payment/pangmeryenda/cancelled",
    PROMO_VALIDATE: "/payment/promo-code/validate",
    PROMO_REDEEM: "/payment/promo-code/redeem",
},
FEATURES: {
    ACCESS: "/features/access",
    CHECK: "/features/check",
    TRACK_USAGE: "/features/track-usage",
},
SUBSCRIPTION: {
    STATUS: "/subscription/status",
    CANCEL: "/subscription/cancel",
},
ADMIN: {
    DASHBOARD: "/admin/dashboard/summary",
    QUESTIONS: "/admin/questions",
    QUESTION: (id) => `/admin/questions/${id}`,
    QUESTIONS_BULK_DELETE: "/admin/questions/bulk-delete",
    QUESTIONS_IMPORT: "/admin/questions/import",
    PASSAGES: "/admin/passages",
    PASSAGE: (id) => `/admin/passages/${id}`,
    USERS: "/admin/users",
    USER: (id) => `/admin/users/${id}`,
    USER_CREATE: "/admin/users/create",
    USER_DEACTIVATE: (id) => `/admin/users/${id}/deactivate`,
    USER_REACTIVATE: (id) => `/admin/users/${id}/reactivate`,
    USER_RESET_PASSWORD: (id) => `/admin/users/${id}/reset-password`,
    USER_VERIFY_EMAIL: (id) => `/admin/users/${id}/verify-email`,
    USERS_EXPORT: "/admin/users/export",
    ANALYTICS: "/admin/analytics",
    EXAMS: "/admin/exams",
    EXAM: (id) => `/admin/exams/${id}`,
    FLAGS: "/admin/content-flags",
    FLAG: (id) => `/admin/content-flags/${id}`,
    FLAGS_SUMMARY: "/admin/content-flags/summary",
    ANNOUNCEMENTS: "/admin/announcements",
    ANNOUNCEMENT: (id) => `/admin/announcements/${id}`,
    SETTINGS: "/admin/settings",
    AUDIT_LOG: "/admin/audit-log",
    AUTH_PROVIDERS: "/admin/auth/providers",
    AUTH_PROVIDER: (p) => `/admin/auth/providers/${p}`,
    AUTH_PROVIDER_TEST: (p) => `/admin/auth/providers/${p}/test`,
    PAYMENT_CONFIG: "/admin/payment/config",
    PAYMENT_CONFIG_TYPE: "/admin/payment/config/type",
    PAYMENT_CONFIG_PLANS: "/admin/payment/config/plans",
    PAYMENT_CONFIG_MANUAL: "/admin/payment/config/manual",
    PAYMENT_CONFIG_MANUAL_CHANNEL: (channelId) => `/admin/payment/config/manual/channels/${channelId}`,
    PAYMENT_CONFIG_MANUAL_CHANNEL_RESET: (channelId) => `/admin/payment/config/manual/channels/${channelId}/reset-limits`,
    PAYMENT_CONFIG_PANGMERYENDA: "/admin/payment/config/pangmeryenda",
    PAYMENT_CONFIG_PANGMERYENDA_TEST: "/admin/payment/config/pangmeryenda/test",
    PAYMENT_SUBMISSIONS: "/admin/payment/submissions",
    PAYMENT_SUBMISSION: (submissionNumber) => `/admin/payment/submissions/${submissionNumber}`,
    PAYMENT_SUBMISSION_REVIEW: (submissionNumber) => `/admin/payment/submissions/${submissionNumber}/review`,
    PAYMENT_SUBMISSION_STATS: "/admin/payment/submissions/stats",
    PAYMENT_REVENUE_REPORT: "/admin/payment/revenue-report",
    FEATURES: "/admin/features",
    FEATURE: (featureId) => `/admin/features/${featureId}`,
    FEATURES_BULK: "/admin/features/bulk",
    FEATURES_PREVIEW: "/admin/features/preview",
    PROMO_CODES: "/admin/promo-codes",
    PROMO_CODE: (id) => `/admin/promo-codes/${id}`,
    PROMO_CODES_BATCH: "/admin/promo-codes/generate-batch",
    USER_UPGRADE: (userId) => `/admin/users/${userId}/upgrade`,
    USER_DOWNGRADE: (userId) => `/admin/users/${userId}/downgrade`,
    USER_EXTEND: (userId) => `/admin/users/${userId}/extend`,
    SUPPORT_DASHBOARD: "/admin/support/dashboard",
    SUPPORT_TICKETS: "/admin/support/tickets",
    SUPPORT_TICKET: (n) => `/admin/support/tickets/${n}`,
    SUPPORT_TICKET_MESSAGES: (n) => `/admin/support/tickets/${n}/messages`,
    SUPPORT_TICKET_STATUS: (n) => `/admin/support/tickets/${n}/status`,
    SUPPORT_TICKET_VERIFY: (n) => `/admin/support/tickets/${n}/verify-identity`,
    SUPPORT_MERGE: "/admin/support/merge-accounts",
    DISPUTES: "/admin/support/identity-disputes",
    DISPUTE: (id) => `/admin/support/identity-disputes/${id}`,
    DATA_REQUESTS: "/admin/data-requests",
    DATA_REQUEST: (id) => `/admin/data-requests/${id}`,
    DELETION_LOG: "/admin/deletion-log",
    UNLOCK_ACCOUNT: (userId) => `/admin/users/${userId}/unlock`,
},
FLAG_QUESTION: (questionId) => `/exam/questions/${questionId}/flag`,
};
export const FLAG_REASONS = [
    { value: "incorrect_answer", label: "Incorrect answer" },
    { value: "typo", label: "Typo or grammatical error" },
    { value: "unclear", label: "Unclear/ambiguous wording" },
    { value: "other", label: "Other" },
];
export const ANNOUNCEMENT_TYPES = ["info", "warning", "maintenance"];
export const DEFAULT_PLATFORM_SETTINGS = {
    examDefaults: {
        totalQuestions: 100,
script
timeLimit: 180,
distribution: {
    "Language Proficiency": 25,
    Mathematics: 30,
    Science: 25,
    "Reading Comprehension": 20,
},
difficultyMix: { easy: .25, medium: .40, hard: .25, very_hard: .10 },
registration: { isOpen: true, requireEmailVerification: true },
leaderboard: { isEnabled: true, showFullName: false },
maintenance: { isEnabled: false, message: "" },
contact: { developerEmail: "", maxMessagesPerHour: 3 },
};
export const DEFAULT_FEATURE_GATING = [
    {
        id: "mock_exam_access",
        name: "Mock Exam Access",
        description: "Start full mock exams.",
        category: "exams",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 2, premium: null },
        limitPeriod: "monthly",
    },
    {
        id: "practice_test_access",
        name: "Practice Test Access",
        description: "Start practice sessions.",
        category: "exams",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 5, premium: null },
        limitPeriod: "daily",
    },
    {
        id: "practice_question_count",
        name: "Max Questions per Practice",
        description: "Maximum number of questions per practice session.",
        category: "exams",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 50, premium: 200 },
        limitPeriod: "total",
    },
    {
        id: "immediate_feedback",
        name: "Immediate Feedback Mode",
        description: "See correctness immediately.",
        category: "practice",
        accessLevel: "all",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "detailed_rationale",
        name: "Detailed Answer Rationale",
        description: "Read detailed explanation for answers.",
        category: "content",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 5, premium: null },
        limitPeriod: "daily",
    },
    {
        id: "subject_filter",
        name: "Subject/Topic Filtering",
        description: "Choose specific subjects and topics.",
        category: "practice",
        accessLevel: "all",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "difficulty_filter",
        name: "Difficulty Configuration",
        description: "Customize question difficulty.",
        category: "practice",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 1, premium: 3 },
        limitPeriod: "total",
    },
    {
        id: "stats_basic",
        name: "Basic Statistics",
        description: "Core progress metrics.",
        category: "analytics",
        accessLevel: "all",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "stats_advanced",
        name: "Advanced Analytics & Insights",
        description: "Deep performance analytics.",
        category: "analytics",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "stats_subject_drilldown",
        name: "Subject Drilldown Analytics",
        description: "Detailed per-subject analytics.",
        category: "analytics",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "weak_area_recommendations",
        name: "Weak Area Recommendations",
        description: "Personalized weak area recommendations.",
        category: "analytics",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 5, premium: null },
        limitPeriod: "weekly",
    },
    {
        id: "leaderboard_access",
        name: "Leaderboard Access",
        description: "View and compare rank with peers.",
        category: "social",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 1, premium: 3 },
        limitPeriod: "total",
    },
    {
        id: "spaced_repetition",
        name: "Spaced Repetition Practice",
        description: "Adaptive spaced repetition cards.",
        category: "practice",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 10, premium: null },
        limitPeriod: "daily",
    },
    {
        id: "exam_history_full",
        name: "Full Exam History",
        description: "Access full historical exam records.",
        category: "analytics",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 5, premium: null },
        limitPeriod: "total",
    },
    {
        id: "export_results",
        name: "Export Results (PDF/CSV)",
        description: "Export analytics and score reports.",
        category: "content",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "ad_free",
        name: "Ad-Free Experience",
        description: "Hide all ad placements.",
        category: "experience",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "priority_support",
        name: "Priority Support Tickets",
        description: "Get prioritized support queue.",
        category: "experience",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "custom_presets",
        name: "Saved Practice Presets",
        description: "Save custom practice presets.",
        category: "practice",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 2, premium: null },
        limitPeriod: "total",
    },
    {
        id: "review_all_questions",
        name: "Review All Exam Questions",
        description: "Review all previously answered exam questions.",
        category: "content",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 1, premium: null },
        limitPeriod: "total",
    },
    {
        id: "predicted_score",
        name: "Predicted UPCAT Score",
        description: "Predicted UPCAT score analytics.",
        category: "analytics",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "percentile_ranking",
        name: "Percentile Ranking",
        description: "Percentile view on leaderboard.",
        category: "analytics",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "video_ad_skip",
        name: "Skip Video Ads",
        description: "Bypass interstitial video ads.",
        category: "experience",
        accessLevel: "premium",
        hasLimit: false,
        limits: null,
        limitPeriod: null,
    },
    {
        id: "blog_full_access",
        name: "Full Blog Article Access",
        description: "Read all blog content without monthly cap.",
        category: "content",
        accessLevel: "all",
        hasLimit: true,
        limits: { free: 3, premium: null },
        limitPeriod: "monthly",
    },
];
export const DEFAULT_PAYMENT_CONFIG = {
    _id: "global",
    activePaymentType: "manual",
    plans: [
        {
            id: "30_days",
            name: "1 Month Premium",
            duration: 30,
            isLifetime: false,
            price: 99,
            currency: "PHP",
            originalPrice: null,
            description: "Full access for 30 days",
            isPopular: true,
            isActive: true,
            features: ["Unlimited mock exams", "No ads", "Advanced analytics", "Priority support"],
            order: 1,
        },
    ],
};
script
{
  id: "90_days",
  name: "3 Months Premium",
  duration: 90,
  isLifetime: false,
  price: .249,
  currency: "PHP",
  originalPrice: 297,
  description: "Full access for 90 days",
  isPopular: false,
  isActive: true,
  features: ["Unlimited mock exams", "No ads", "Advanced analytics", "Priority support"],
  order: 2,
},
{
  id: "180_days",
  name: "6 Months Premium",
  duration: 180,
  isLifetime: false,
  price: .449,
  currency: "PHP",
  originalPrice: 594,
  description: "Full access for 180 days",
  isPopular: false,
  isActive: true,
  features: ["Unlimited mock exams", "No ads", "Advanced analytics", "Priority support"],
  order: 3,
},
{
  id: "365_days",
  name: "1 Year Premium",
  duration: 365,
  isLifetime: false,
  price: .799,
  currency: "PHP",
  originalPrice: 1188,
  description: "Full access for 365 days",
  isPopular: false,
  isActive: true,
  features: ["Unlimited mock exams", "No ads", "Advanced analytics", "Priority support"],
  order: 4,
},
],
manual: {
  processingTimeMessage: "Payment verification takes up to 12 hours",
  instructionsHeader: "How to Pay",
  instructionsBody: `1. Select your preferred channel.\n2. Send the exact amount.\n3. Save your transaction reference.\n4. Upload a clear screenshot of payment confirmation.`,
  autoDisableThreshold: .90,
  channels: [
    {
      id: "gcash",
      name: "GCash",
      type: "ewallet",
      icon: "",
      enabled: true,
      accountName: "UPCAT Simulator",
      accountNumber: "0917XXXXXX",
      bankName: null,
      qrCodeImage: null,
      qrCodeLabel: "Scan to pay via GCash",
      limits: {
        daily: { max: 50000, current: 0, lastResetDate: "1970-01-01" },
        monthly: { max: 100000, current: 0, lastResetMonth: "1970-01" },
      },
      autoDisabled: false,
      autoDisabledReason: null,
      autoDisabledAt: null,
      additionalNotes: "Include your UPCAT username in transfer notes.",
      order: 1,
    },
    {
      id: "maya",
      name: "Maya",
      type: "ewallet",
      icon: "",
      enabled: true,
      accountName: "UPCAT Simulator",
      accountNumber: "0999XXXXXX",
      bankName: null,
      qrCodeImage: null,
      qrCodeLabel: "Scan to pay via Maya",
      limits: {
        daily: { max: 50000, current: 0, lastResetDate: "1970-01-01" },
        monthly: { max: 100000, current: 0, lastResetMonth: "1970-01" },
      },
      autoDisabled: false,
      autoDisabledReason: null,
      autoDisabledAt: null,
      additionalNotes: null,
      order: 2,
    },
    {
      id: "bdo",
      name: "BDO",
      type: "bank",
      icon: "",
      enabled: true,
      accountName: "UPCAT Simulator Inc.",
      accountNumber: "1234-5678-9012",
      bankName: "BDO Unibank",
      qrCodeImage: null,
      qrCodeLabel: null,
      limits: {
        daily: { max: null, current: 0, lastResetDate: "1970-01-01" },
script
monthly: { max: null, current: 0, lastResetMonth: "1970-01" },
},
autoDisabled: false,
autoDisabledReason: null,
autoDisabledAt: null,
additionalNotes: null,
order: 3,
],
},
pangmeryenda: {
enabled: false,
apiBaseUrl: "https://api.pangmeryenda.com",
apiKey: null,
apiSecretEnc: null,
webhookSecret: null,
merchantId: null,
planMapping: [],
successRedirectUrl: "/payment/success",
failureRedirectUrl: "/payment/failed",
cancelRedirectUrl: "/payment/cancelled",
webhookEndpoint: "/api/payment/pangmeryenda/webhook",
},
featureGating: {
features: DEFAULT_FEATURE_GATING,
},
updatedAt: new Date(0).toISOString(),
updatedBy: null,
};
export const CONTACT_SUBJECTS = [
"General Inquiry",
"Bug Report",
"Feature Request",
"Content Issue",
"Other",
];
export const CONTACT_LIMITS = {
nameMax: 100,
emailMax: 200,
messageMin: 10,
messageMax: 5000,
maxPerHour: 3,
};
// --- Social login
export const SOCIAL_PROVIDERS = ["google", "linkedin", "facebook"];
export const SOCIAL_PROVIDER_META = {
google: {
label: "Google",
brandColor: "#ea4335",
defaultScopes: ["openid", "email", "profile"],
},
linkedin: {
label: "LinkedIn",
brandColor: "#0a66c2",
defaultScopes: ["openid", "profile", "email"],
},
facebook: {
label: "Facebook",
brandColor: "#1877f2",
defaultScopes: ["email", "public_profile"],
};
export const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";
// --- Account recovery
/**
 * Codes are XXXX-XXXX-XXXX, alphanumeric, excluding ambiguous characters.
 */
export const RECOVERY_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789";
export const RECOVERY_CODE_COUNT = 10;
/**
 * 15 minutes for recovery JWTs issued by the verify endpoints...
 */
export const RECOVERY_TOKEN_TTL_SECONDS = 15 * 60;
/**
 * Pre-defined questions available to the user (must be exactly 3 chosen).
 */
export const SECURITY_QUESTION_BANK = [
"What was the name of your first pet?",
"What elementary school did you attend?",
"What is your mother's maiden name?",
"What city were you born in?",
"What was your childhood nickname?",
"What was the name of your first teacher?",
"What is the make of your first car?",
"What is your favorite book?",
"What was the name of the street you grew up on?",
"In what city did your parents meet?",
];
export const SECURITY_QUESTIONS_REQUIRED = 3;
/**
 * Login lockout thresholds...
 */
export const LOGIN_LOCKOUT = {
softThreshold: 5,
softDurationMs: 15 * 60 * 1000,
mediumThreshold: 10,
mediumDurationMs: 60 * 60 * 1000,
hardThreshold: 20,
/**
 * Indefinite lock = year.9999.
 */
hardUntil: new Date("9999-12-31T00:00:00Z").toISOString(),
};
// --- Support tickets
export const SUPPORT_TICKET_TYPES = [
"account_recovery",
"identity_dispute",
"data_export",
"data_deletion",
"account_merge",
"general_support",
];
export const SUPPORT_TICKET_TYPE_META = {
account_recovery: {
script
label: "Account Recovery",
description: "I can't sign in / regain access.",
icon: "🔗",
},
identity_dispute: {
label: "Identity Dispute",
description: "A social account I own is linked to someone else.",
icon: "🆔",
},
data_export: {
label: "Data Export Help",
description: "Questions about exporting my data.",
icon: "🗄️",
},
data_deletion: {
label: "Data Deletion Help",
description: "Questions about deleting my account/data.",
icon: "🗑️",
},
account_merge: {
label: "Account Merge",
description: "I have two accounts and want them combined.",
icon: "🗄️",
},
general_support: {
label: "General Support",
description: "Other questions.",
icon: "💬",
};
export const SUPPORT_TICKET_STATUSES = ["open", "in_progress", "awaiting_user", "resolved", "rejected"];
export const SUPPORT_TICKET_PRIORITIES = ["low", "medium", "high", "critical"];
export const SUPPORT_TICKET_STATUS_META = {
open: { label: "Open", color: "blue" },
in_progress: { label: "In Progress", color: "amber" },
awaiting_user: { label: "Awaiting User", color: "purple" },
resolved: { label: "Resolved", color: "green" },
rejected: { label: "Rejected", color: "slate" },
};
export const SUPPORT_TICKET_PRIORITY_META = {
low: { label: "Low", color: "slate" },
medium: { label: "Medium", color: "blue" },
high: { label: "High", color: "amber" },
critical: { label: "Critical", color: "red" },
};
/** Auto-close threshold for tickets in awaiting_user state. */
export const SUPPORT_AUTO_CLOSE_DAYS = 14;
/** Guest support submission rate limit. */
export const SUPPORT_GUEST_RATE = { limit: 2, windowMs: 60 * 60000 };
// --- Data requests
export const DATA_EXPORT_TTL_HOURS = 24;
/** Days from confirmation to scheduled deletion. */
export const DATA_DELETION_GRACE_DAYS = .7;
/** Hours the confirm-email link stays valid. */
export const DATA_DELETION_CONFIRM_TTL_HOURS = 48;
// --- Inactivity thresholds
export const INACTIVITY_REMINDER_DAYS = .365;
export const INACTIVITY_FLAG_DAYS = 730;
// --- Cron schedule cadences (informational)
export const CRON_SCHEDULES = {
executePendingDeletions: "0 * * * *", // hourly
cleanupExpiredExports: "0 */6 * * *", // every 6h
autoCloseStaleTickets: "0 3 * * *", // daily at 03:00
accountInactivityCheck: "0 4 * * 0", // weekly Sunday at 04:00
};
// --- Phase 12 🎯 Gamification, Spaced Repetition, PWA
// --- XP / Levels
export const MAX_LEVEL = 100;
/** XP required to *reach* a given level (cumulative). */
export function xpRequiredForLevel(level) {
if (level <= 1)
return 0;
if (level > MAX_LEVEL)
level = MAX_LEVEL;
return Math.floor(100 * Math.pow(level - 1, 1.5));
}
/** Compute level + bounds + title from a raw XP total. */
export function levelFromXp(xp) {
let level = 1;
while (level < MAX_LEVEL && xp >= xpRequiredForLevel(level + 1)) {
level += 1;
}
const xpForCurrent = xpRequiredForLevel(level);
const xpForNext = level >= MAX_LEVEL ? xpForCurrent : xpRequiredForLevel(level + 1);
return {
level,
title: titleForLevel(level),
xpForCurrent,
xpForNext,
xpToNextLevel: Math.max(0, xpForNext - xp),
};
}
export function titleForLevel(level) {
if (level >= 100)
return "UPCAT Champion";
script
if (level >= 90)
    return "Legend";
if (level >= 80)
    return "Grandmaster";
if (level >= 70)
    return "Master";
if (level >= 60)
    return "Expert";
if (level >= 50)
    return "Achiever";
if (level >= 40)
    return "Scholar";
if (level >= 30)
    return "Senior";
if (level >= 20)
    return "Junior";
if (level >= 10)
    return "Sophomore";
return "Freshman";

/**
 * Streak multiplier thresholds (inclusive lower bound).
 */
export const STREAK_MULTIPLIER_TIERS = [
    { minDays: .30, multiplier: 2.0 },
    { minDays: .14, multiplier: 1.75 },
    { minDays: .7, multiplier: 1.5 },
    { minDays: .3, multiplier: 1.25 },
    { minDays: 0, multiplier: 1.0 },
];

export function streakMultiplier(days) {
    for (const tier of STREAK_MULTIPLIER_TIERS) {
        if (days >= tier.minDays)
            return tier.multiplier;
    }
    return 1.0;
}

/**
 * Base XP rewards (also exposed via platform_settings.gamification.xp).
 */
export const XP_REWARDS = {
    EXAM_COMPLETED: 50,
    PER_CORRECT: -2,
    SCORE_ABOVE_80: .25,
    SCORE_ABOVE_90: .50,
    PERFECT_SCORE: 200,
    PERFECT_SUBJECT: 30,
    FIRST_EXAM: 100,
    DAILY_LOGIN: 10,
    REVIEW_ALL_INCORRECT: -20,
    PRACTICE_COMPLETED: 30,
    PRACTICE_PER_CORRECT: .2,
};

// --- Achievements --------------------------------
export const ACHIEVEMENT_CATEGORIES = [
    "milestone",
    "performance",
    "streak",
    "dedication",
    "mastery",
    "social",
];

export const ACHIEVEMENT_RARITIES = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
];

export const ACHIEVEMENT_RARITY_META = {
    common: { label: "Common", color: "slate", glow: "shadow-slate-200" },
    uncommon: { label: "Uncommon", color: "emerald", glow: "shadow-emerald-200" },
    rare: { label: "Rare", color: "sky", glow: "shadow-sky-300" },
    epic: { label: "Epic", color: "violet", glow: "shadow-violet-300" },
    legendary: { label: "Legendary", color: "amber", glow: "shadow-amber-300" },
};

export const ACHIEVEMENT_CATEGORY_META = {
    milestone: { label: "Milestones", icon: "trophy" },
    performance: { label: "Performance", icon: "target" },
    streak: { label: "Streaks", icon: "flame" },
    dedication: { label: "Dedication", icon: "clock" },
    mastery: { label: "Mastery", icon: "brain" },
    social: { label: "Social", icon: "users" },
};

// --- Spaced Repetition --------------------------------
export const SRS_DEFAULT_EASE = 2.5;
export const SRS_MIN_EASE = 1.3;
export const SRS_MASTERY_INTERVAL_DAYS = .30;
export const SRS_MASTERY_EASE = 2.5;

export const PRACTICE_DEFAULTS = {
    maxQuestions: 20,
    newCardsLimit: 5,
    includeNew: true,
};

export const PRACTICE_MODES = [
    "review",
    "weak_areas",
    "subject_focus",
    "mixed",
    "random",
];

// --- PWA / Push --------------------------------
export const PWA_INSTALL_DISMISS_DAYS = .7;
export const PWA_INSTALL_MIN_VISITS = 3;
export const OFFLINE_PREFETCH_LIMIT_DEFAULT = 100;

export const PUSH_NOTIFICATION_TYPES = [
    "daily_reminder",
    "streak_alert",
];
script
};
// --- Phase-12 API routes (registered alongside the main API_ROUTES tree). ---
export const API_ROUTES_V12 = {
    GAMIFICATION: {
        PROFILE: "/gamification/profile",
        ACHIEVEMENTS: "/gamification/achievements",
        LEADERBOARD: "/gamification/leaderboard",
        WEEKLY_CHALLENGE: "/gamification/weekly-challenge",
        DISMISS_NOTIFICATIONS: "/gamification/dismiss-notifications",
    },
    PRACTICE: {
        START: "/practice/start",
        ANSWER: (id) => `/practice/${id}/answer`,
        RATE: (id) => `/practice/${id}/rate`,
        COMPLETE: (id) => `/practice/${id}/complete`,
        STATS: "/practice/stats",
        CARDS: "/practice/cards",
        BOOTSTRAP: "/practice/bootstrap",
    },
    PUSH: {
        PUBLIC_KEY: "/push/public-key",
        SUBSCRIBE: "/push/subscribe",
        UNSUBSCRIBE: "/push/unsubscribe",
        PREFERENCES: "/push/preferences",
    },
    ADMIN: {
        GAMIFICATION: "/admin/gamification",
        GAMIFICATION_GRANT_XP: "/admin/gamification/grant-xp",
        GAMIFICATION_ACHIEVEMENT: (id) => `/admin/gamification/achievements/${id}`,
        GAMIFICATION_ACHIEVEMENTS: "/admin/gamification/achievements",
        GAMIFICATION_CHALLENGES: "/admin/gamification/challenges",
        PUSH_TEST: "/admin/push/test",
        PUSH_BROADCAST: "/admin/push/broadcast",
    },
};
// --- Phase-12 cron cadences ---
export const CRON_SCHEDULES_V12 = {
    assignWeeklyChallenges: "0 4 * * 1", // Mondays 04:00 UTC
    studyReminders: "0 9 * * *", // 09:00 UTC daily
    streakWarnings: "0 19 * * *", // 19:00 UTC daily
};
export const ACHIEVEMENT_CATALOG_SEED = [
    // --- Milestones ---
    { id: "first_steps", category: "milestone", rarity: "common", title: "First Steps", description: "Complete your very first practice exam.", icon: "footprints", xpReward: 50, points: 10, condition: { kind: "examCount", gte: 1 } },
    { id: "getting_serious", category: "milestone", rarity: "common", title: "Getting Serious", description: "Complete 5 practice exams.", icon: "book-open", xpReward: 100, points: 20, condition: { kind: "examCount", gte: 5 } },
    { id: "dedicated_learner", category: "milestone", rarity: "uncommon", title: "Dedicated Learner", description: "Complete 25 practice exams.", icon: "graduation-cap", xpReward: 250, points: 50, condition: { kind: "examCount", gte: 25 } },
    { id: "exam_machine", category: "milestone", rarity: "rare", title: "Exam Machine", description: "Complete 100 practice exams.", icon: "rocket", xpReward: 500, points: 100, condition: { kind: "examCount", gte: 100 } },
    { id: "exam_titan", category: "milestone", rarity: "epic", title: "Exam Titan", description: "Complete 250 practice exams.", icon: "mountain", xpReward: 1000, points: 250, condition: { kind: "examCount", gte: 250 } },
    // --- Performance ---
    { id: "high_scorer", category: "performance", rarity: "uncommon", title: "High Scorer", description: "Score 80% or higher on a practice exam.", icon: "trophy", xpReward: 100, points: 25, condition: { kind: "scoreThreshold", gte: 80, count: 1 } },
    { id: "top_of_class", category: "performance", rarity: "rare", title: "Top of the Class", description: "Score 90% or higher on a practice exam.", icon: "award", xpReward: 200, points: 50, condition: { kind: "scoreThreshold", gte: 90, count: 1 } },
    { id: "flawless", category: "performance", rarity: "legendary", title: "Flawless Victory", description: "Achieve a perfect 100% on a practice exam.", icon: "crown", xpReward: 500, points: 200, condition: { kind: "perfectScores", gte: 1 } },
    { id: "perfectionist", category: "performance", rarity: "epic", title: "Perfectionist", description: "Achieve 5 perfect scores.", icon: "diamond", xpReward: 1000, points: 300, condition: { kind: "perfectScores", gte: 5 } },
    { id: "consistent_excellence", category: "performance", rarity: "epic", title: "Consistent Excellence", description: "Score 90%+ on 10 different exams.", icon: "shield-check", xpReward: 750, points: 200, condition: { kind: "scoreThreshold", gte: 90, count: 10 } },
    // --- Streaks ---
    { id: "warming_up", category: "streak", rarity: "common", title: "Warming Up", description: "Maintain a 3-day study streak.", icon: "flame", xpReward: 50, points: 15, condition: { kind: "streakDays", gte: 3 } },
    { id: "on_fire", category: "streak", rarity: "uncommon", title: "On Fire", description: "Maintain a 7-day study streak.", icon: "flame", xpReward: 150, points: 40, condition: { kind: "streakDays", gte: 7 } },
    { id: "fortnight_focus", category: "streak", rarity: "rare", title: "Fortnight Focus", description: "Maintain a 14-day study streak.", icon: "calendar-days", xpReward: 300, points: 75, condition: { kind: "streakDays", gte: 14 } },
    { id: "unstoppable", category: "streak", rarity: "epic", title: "Unstoppable", description: "Maintain a 30-day study streak.", icon: "zap", xpReward: 750, points: 200, condition: { kind: "streakDays", gte: 30 } },
    { id: "legendary_dedication", category: "streak", rarity: "legendary", title: "Legendary Dedication", description: "Maintain a 100-day study streak.", icon: "star", xpReward: 2500, points: 500, condition: { kind: "streakDays", gte: 100 } },
    // --- Dedication ---
    { id: "early_bird", category: "dedication", rarity: "common", title: "Early Bird", description: "Answer 100 questions in total.", icon: "sunrise", xpReward: 75, points: 20, condition: { kind: "questionsAnswered", gte: 100 } },
    { id: "knowledge_seeker", category: "dedication", rarity: "uncommon", title: "Knowledge Seeker", description: "Answer 500 questions in total.", icon: "search", xpReward: 200, points: 50, condition: { kind: "questionsAnswered", gte: 500 } },
    { id: "scholar", category: "dedication", rarity: "rare", title: "Scholar", description: "Answer 2,000 questions in total.", icon: "library", xpReward: 500, points: 125, condition: { kind: "questionsAnswered", gte: 2000 } },
    { id: "marathon_mind", category: "dedication", rarity: "epic", title: "Marathon Mind", description: "Accumulate 1,000 minutes of study time.", icon: "timer", xpReward: 600, points: 150, condition: { kind: "studyMinutes", gte: 1000 } },
    { id: "deep_focus", category: "dedication", rarity: "rare", title: "Deep Focus", description: "Accumulate 300 minutes of study time.", icon: "headphones", xpReward: 250, points: 75, condition: { kind: "studyMinutes", gte: 300 } },
    // --- Mastery ---
    { id: "math_master", category: "mastery", rarity: "rare", title: "Math Master", description: "Score 100% on a Mathematics exam.", icon: "calculator", xpReward: 300, points: 100, condition: { kind: "perfectSubject", subject: "Mathematics", gte: 1 } },
    { id: "science_savant", category: "mastery", rarity: "rare", title: "Science Savant", description: "Score 100% on a Science exam.", icon: "flask-conical", xpReward: 300, points: 100, condition: { kind: "perfectSubject", subject: "Science", gte: 1 } },
    { id: "language_luminary", category: "mastery", rarity: "rare", title: "Language Luminary", description: "Score 100% on a Language Proficiency exam.", icon: "languages", xpReward: 300, points: 100, condition: { kind: "perfectSubject", subject: "Language Proficiency", gte: 1 } },
    { id: "reading_rockstar", category: "mastery", rarity: "rare", title: "Reading Rockstar", description: "Score 100% on a Reading Comprehension exam.", icon: "book-marked", xpReward: 300, points: 100, condition: { kind: "perfectSubject", subject: "Reading Comprehension", gte: 1 } },
    { id: "quadruple_threat", category: "mastery", rarity: "legendary", title: "Quadruple Threat", description: "Reach level 50.", icon: "swords", xpReward: 2000, points: 500, condition: { kind: "levelReached", gte: 50 } },
    // --- Performance/Mastery hybrids (level + accuracy) ---
    { id: "level_10", category: "milestone", rarity: "uncommon", title: "Sophomore", description: "Reach level 10.", icon: "chevron-up", xpReward: 100, points: 25, condition: { kind: "levelReached", gte: 10 } },
    { id: "level_25", category: "milestone", rarity: "rare", title: "Upperclassman", description: "Reach level 25.", icon: "chevrons-up",
script
xpReward: 300,
points: .75,
condition: { kind: "levelReached", gte: .25 },
},
{ id: "level_50", category: "milestone", rarity: "epic", title: "Achiever", description: "Reach level 50.", icon: "trending-up",
xpReward: 750,
points: 200,
condition: { kind: "levelReached", gte: .50 },
},
{ id: "level_100", category: "milestone", rarity: "legendary", title: "UPCAT Champion", description: "Reach the max level of 100.", icon: "crown",
xpReward: 5000,
points: 1000,
condition: { kind: "levelReached", gte: .100 },
},
// --- Practice / SRS-related (still meaningful even before SRS UI ships)
{ id: "practice_starter", category: "dedication", rarity: "common", title: "Practice Starter", description: "Complete your first practice session.", icon: "play",
xpReward: 50,
points: .10,
condition: { kind: "practiceSessions", gte: 1 },
},
{ id: "practice_regular", category: "dedication", rarity: "uncommon", title: "Practice Regular", description: "Complete 25 practice sessions.", icon: "repeat",
xpReward: 250,
points: .60,
condition: { kind: "practiceSessions", gte: .25 },
},
{ id: "review_perfectionist", category: "performance", rarity: "uncommon", title: "Reviewer", description: "Answer 100 questions correctly.", icon: "check-check",
xpReward: 150,
points: .40,
condition: { kind: "correctAnswers", gte: 100 },
};
export const WEEKLY_CHALLENGE_CATALOG_SEED = [
{ id: "weekly_exams_3", title: "Three-Exam Week", description: "Complete 3 practice exams this week.", metric: "exams_completed", target: .3, xpReward: 250, weight: .10 },
{ id: "weekly_exams_5", title: "Exam Marathon", description: "Complete 5 practice exams this week.", metric: "exams_completed", target: .5, xpReward: 500, weight: .6 },
{ id: "weekly_correct_100", title: "Hundred Correct", description: "Answer 100 questions correctly this week.", metric: "questions_correct", target: 100,
xpReward: 300, weight: .8 },
{ id: "weekly_correct_250", title: "Quarter Champion", description: "Answer 250 questions correctly this week.", metric: "questions_correct", target: 250,
xpReward: 700, weight: .4 },
{ id: "weekly_minutes_120", title: "Two-Hour Focus", description: "Study for 120 minutes this week.", metric: "study_minutes", target: 120, xpReward: 250, weight: .9 },
{ id: "weekly_minutes_300", title: "Deep Dive", description: "Study for 300 minutes this week.", metric: "study_minutes", target: 300, xpReward: 600, weight: .5 },
{ id: "weekly_practice_5", title: "Practice Pentathlon", description: "Complete 5 practice sessions this week.", metric: "practice_sessions", target: .5,
xpReward: 350, weight: .7 },
{ id: "weekly_perfect_1", title: "Pursuit of Perfection", description: "Score 100% on at least one exam this week.", metric: "perfect_scores", target: 1,
xpReward: 400, weight: .6 },
{ id: "weekly_high_3", title: "Elite Trio", description: "Score 85%+ on 3 exams this week.", metric: "score_above_threshold", target: 3, threshold: 85,
xpReward: 500, weight: .5 },
{ id: "weekly_high_5", title: "Top of the Curve", description: "Score 90%+ on 5 exams this week.", metric: "score_above_threshold", target: 5, threshold: 90,
xpReward: 800, weight: .3 },
];
// --- Leaderboard config
export const LEADERBOARD_PAGE_SIZE = .50;
export const LEADERBOARD_SCOPES = ["weekly", "monthly", "all_time"];
// --- Phase 15 -- Security Hardening
export const SECURITY_EVENT_TYPES = [
"rate_limit.exceeded",
"rate_limit.ip_blocked",
"auth.brute_force_detected",
"auth.credential_stuffing_detected",
"auth.impossible_travel",
"auth.suspicious_login",
"auth.account_takeover_attempt",
"auth.failed_login",
"auth.unknown_account",
"bot.detected",
"bot.captcha_failed",
"bot.scraping_detected",
"bot.honeypot_triggered",
"bot.timing_trap",
"dos.spike_detected",
"dos.slowloris_detected",
"input.injection_attempt",
"input.xss_attempt",
"input.payload_too_large",
"input.proto_pollution",
"session.hijack_attempt",
"session.token_reuse",
"session.revoked",
"admin.unauthorized_access_attempt",
"admin.lockdown_enabled",
"admin.lockdown_disabled",
"admin.manual_block_added",
"admin.manual_block_removed",
"admin.config_changed",
"admin.sessions_revoked_all",
"content.mass_flagging",
"exam.answer_automation_detected",
"cors.unauthorized_origin",
];
export const SECURITY_EVENT_RETENTION_DAYS = .90;
/** Points added to an IP's threat score when a signal fires. */
export const THREAT_SCORE_ADJUSTMENTS = {
failed_login: 5,
failed_login_unknown_account: 8,
failed_login_burst: 15,
registration_from_datacenter: 10,
registration_from_vpn: 5,
request_to_404: .3,
malformed_request: .5,
injection_attempt: 25,
xss_attempt: 25,
rate_limit_first: 10,
rate_limit_repeat: 20,
captcha_failed: 15,
captcha_failed_burst: 30,
honeypot_triggered: 40,
timing_trap: 20,
bot_behavioral: 30,
impossible_travel: 25,
multi_account_fingerprint: 20,
exam_speed_anomaly: .15,
scraping_pattern: 35,
during_maintenance: .5,
admin_without_role: 20,
cors_unauthorized: .8,
proto_pollution: 25,
payload_too_large: 10,
};
export const THREAT_SCORE_DECAY_PER_HOUR = .1;
export const THREAT_SCORE_DECAY_PER_DAY_CLEAN = 5;
export const THREAT_SCORE_MIN = 0;
script
export const THREAT_SCORE_MAX = 100;
export const REPUTATION_THRESHOLDS = {
    trusted: 0, // 0-14
    neutral: 15, // 15-49
    suspicious: 50, // 50-84
    blocked: 85, // 85+
};
export function classifyThreatScore(score) {
    if (score >= REPUTATION_THRESHOLDS.blocked)
        return "blocked";
    if (score >= REPUTATION_THRESHOLDS.suspicious)
        return "suspicious";
    if (score >= REPUTATION_THRESHOLDS.neutral)
        return "neutral";
    return "trusted";
}
/** Default singleton document -- used when security_config is empty. */
export const DEFAULT_SECURITY_CONFIG = {
    _id: "global",
    ratelimits: {
        global: { requestsPerSecond: 1000, burstLimit: 2000 },
        perIp: { requestsPerMinute: 100, requestsPerHour: 2000, requestsPerDay: 20000 },
        perUser: { requestsPerMinute: 60, requestsPerHour: 1000 },
        endpoints: {
            "POST /api/auth/login": { perIp: { perMinute: 5, perHour: 20 } },
            "POST /api/auth/register": { perIp: { perMinute: 3, perHour: 10 } },
            "POST /api/auth/forgot-password": { perIp: { perMinute: 3, perHour: 5 } },
            "POST /api/auth/recovery-codes/verify": { perIp: { perMinute: 5, perHour: 15 } },
            "POST /api/auth/security-questions/verify": { perIp: { perMinute: 3, perHour: 10 } },
            "POST /api/exam/start": { perUser: { perMinute: 2, perHour: 10 } },
            "GET /api/exam/questions": { perUser: { perMinute: 30 } },
            "POST /api/exam/answer": { perUser: { perMinute: 60 } },
            "POST /api/exam/answer-bulk": { perUser: { perMinute: 10 } },
            "POST /api/support/tickets/guest": { perIp: { perMinute: 1, perHour: 3 } },
            "POST /api/contact": { perIp: { perMinute: 1, perHour: 3 } },
            "POST /api/auth/social/start": { perIp: { perMinute: 10, perHour: 30 } },
            "GET /api/stats": { perUser: { perMinute: 20 } },
            "GET /api/admin": { perUser: { perMinute: 60 } },
        },
    },
    botDetection: {
        enabled: true,
        captchaThreshold: .50,
        blockThreshold: .85,
        honeypotEnabled: true,
        fingerprintingEnabled: true,
        behavioralAnalysisEnabled: true,
    },
    dos: {
        enabled: true,
        globalRpsThreshold: 1000,
        perIpSpikeMultiplier: .5,
        slowlorisTimeout: .30,
        maxConcurrentPerIp: 50,
        maxRequestBodySize: 1048576, // 1 MiB
        maxUrlLength: 2048,
    },
    anomalyDetection: {
        enabled: true,
        impossibleTravelEnabled: true,
        impossibleTravelThresholdKm: .500,
        impossibleTravelThresholdMin: .30,
        unusualHoursEnabled: false,
        newDeviceAlertEnabled: true,
    },
    autoResponse: {
        autoBlockEnabled: true,
        autoBlockDuration: 3600,
        escalationThresholds: { softBlock: .70, hardBlock: .90, permanentBlock: .95 },
        notifyAdminOnCritical: true,
        cooldownPeriod: 300,
    },
    headers: {
        hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true },
        csp: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            frameSrc: ["none"],
            objectSrc: ["none"],
            baseUri: ["'self'"],
        },
        xFrameOptions: "DENY",
        xContentTypeOptions: "nosniff",
        referrerPolicy: "strict-origin-when-cross-origin",
        permissionsPolicy: "camera=(), microphone=(), geolocation=()",
    },
    lockdown: {
        enabled: false,
        enabledAt: null,
        enabledBy: null,
        reason: null,
    },
    updatedAt: new Date(0).toISOString(),
    updatedby: null,
};
// --- Phase-15 API routes --------------------------------
export const API_ROUTES_V15 = {
    CAPTCHA: {
        GENERATE: "/captcha/generate",
        VERIFY: "/captcha/verify",
script
ACCOUNT: {
    SESSIONS: "/account/security/sessions",
    SESSION_REVOKE: (id) => `/account/security/sessions/${id}/revoke`,
    SESSIONS_REVOKE_ALL: "/account/security/sessions/revoke-all",
    ACTIVITY: "/account/security/activity",
},
ADMIN: {
    DASHBOARD: "/admin/security/dashboard",
    EVENTS: "/admin/security/events",
    EVENT: (id) => `/admin/security/events/${id}`,
    EVENT_REVIEW: (id) => `/admin/security/events/${id}/review`,
    IPS: "/admin/security/ips",
    IP: (ip) => `/admin/security/ips/${encodeURIComponent(ip)}`,
    IP_BLOCK: (ip) => `/admin/security/ips/${encodeURIComponent(ip)}/block`,
    IP_UNBLOCK: (ip) => `/admin/security/ips/${encodeURIComponent(ip)}/unblock`,
    IP_BLOCK_RANGE: "/admin/security/ips/block-range",
    BLOCKED: "/admin/security/blocked",
    BLOCKED_ITEM: (id) => `/admin/security/blocked/${id}`,
    CONFIG: "/admin/security/config",
    LOCKDOWN_ENABLE: "/admin/security/emergency/lockdown",
    LOCKDOWN_DISABLE: "/admin/security/emergency/unlock",
    REPORTS: "/admin/security/reports/attack-summary",
},
// --- Phase-15 cron cadences
export const CRON_SCHEDULES_V15 = {
    threatScoreDecay: "* * * * *", // hourly
    expiredBlocksCleanup: "* /15 * * * *", // every 15 min
    securityReport: "0 0 * * *", // daily midnight UTC
    staleSessionCleanup: "0 */6 * * *", // every 6 hours
    ipIntelligenceAggregation: "30 0 * * *", // daily 00:30 UTC
};
export const RATE_LIMIT_BUCKET_TTL_SECONDS = 86400; // 24h inactivity -> auto-remove
export const USER_SESSION_RETENTION_DAYS = 30;
/** Rate-limit windows in milliseconds, matching the perMinute/perHour/perDay keys. */
export const RATE_WINDOWS = {
    perMinute: 60000,
    perHour: 3600000,
    perDay: 86400000,
};
// --- CAPTCHA
export const CAPTCHA_TYPES = ["math", "image", "puzzle", "pow"];
export const CAPTCHA_TTL_SECONDS = 600; // 10 minutes
export const CAPTCHA_TOKEN_TTL_SECONDS = 600;
export const CAPTCHA_MAX_ATTEMPTS = 3;
export const POW_DIFFICULTY_NORMAL = 4; // 4 leading hex zeros (~16-bit work)
export const POW_DIFFICULTY_ELEVATED = 6;
export const PUZZLE_TOLERANCE_PX = 6;
export const PUZZLE_MIN_SOLVE_MS = 300;
export const PUZZLE_TRACK_WIDTH = 320;
export const PUZZLE PIECE_SIZE = 48;
export const IMAGE_CAPTCHA_GRID_SIZE = 9;
export const IMAGE_CAPTCHA_TARGET_MIN = 2;
export const IMAGE_CAPTCHA_TARGET_MAX = 4;