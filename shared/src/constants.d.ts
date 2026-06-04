export declare const SUBJECT_areas: readonly ["Language-Proficiency", "Mathematics", "Science", "Reading-Comprehension"];
export declare const SUBJECT_META: Record<typeof SUBJECT_areas[number], {
    label: string;
    icon: string;
    color: string;
}>;
export declare const DIFFICULTIES: readonly ["easy", "medium", "hard", "very-hard"];
export declare const DIFFICULTY_LABELS: Record<typeof DIFFICULTIES[number], string>;
export declare const DIFFICULTY_DESCRIPTIONS: Record<typeof DIFFICULTIES[number], string>;
export declare const DEFAULT_EXAM_CONFIG: {
    readonly totalQuestions: 100;
    readonly distribution: {
        readonly "Language-Proficiency": 25;
        readonly Mathematics: 30;
        readonly Science: 25;
        readonly "Reading-Comprehension": 20;
    };
    readonly difficultyMix: {
        readonly easy: 25;
        readonly medium: 40;
        readonly hard: 25;
        readonly very_hard: 10;
    };
    readonly timeLimit: 180;
};
export declare const PASSING_PERCENTAGE = 60;
export declare const PASSWORD_MIN_LENGTH = 8;
export declare const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
export declare const RESET_TOKEN_EXPIRY_HOURS = 1;
export declare const PASSWORD_RULES: {
    readonly minLength: 8;
    readonly requireUppercase: true;
    readonly requireLowercase: true;
    readonly requireNumber: true;
    readonly requireSpecial: true;
};
export declare const API_ROUTES: {
    readonly AUTH: {
        readonly REGISTER: "/auth/register";
        readonly LOGIN: "/auth/login";
        readonly VERIFY_EMAIL: "/auth/verify-email";
        readonly ME: "/auth/me";
        readonly FORGOT_PASSWORD: "/auth/forgot-password";
        readonly RESET_PASSWORD: "/auth/reset-password";
        readonly PROVIDERS: "/auth/providers";
        readonly SOCIAL_START: (provider: string) => string;
        readonly SOCIAL_CALLBACK: (provider: string) => string;
        readonly LINKED_ACCOUNTS: "/auth/linked-accounts";
        readonly UNLINK: "/auth/unlink";
        readonly SET_PASSWORD: "/auth/set-password";
        readonly RECOVERY_CODES_GENERATE: "/auth/recovery-codes/generate";
        readonly RECOVERY_CODES_STATUS: "/auth/recovery-codes/status";
        readonly RECOVERY_CODES_VERIFY: "/auth/recovery-codes/verify";
        readonly RECOVER_ACCOUNT: "/auth/recover-account";
        readonly SECURITY_QUESTIONS_SET: "/auth/security-questions/set";
        readonly SECURITY_QUESTIONS_LOOKUP: "/auth/security-questions/lookup";
        readonly SECURITY_QUESTIONS_VERIFY: "/auth/security-questions/verify";
    };
    readonly ACCOUNT: "/account";
    readonly ACCOUNT_DATA_EXPORT: "/account/data-export";
    readonly ACCOUNT_DATA_EXPORT_ID: (id: string) => string;
    readonly ACCOUNT_DATA_EXPORT_DOWNLOAD: (id: string) => string;
    readonly ACCOUNT_DELETION_REQUEST: "/account/deletion-request";
    readonly ACCOUNT_DELETION_REQUEST_CONFIRM: (id: string) => string;
    readonly ACCOUNT_DELETION_REQUEST_CANCEL: (id: string) => string;
    readonly SUPPORT: {
        readonly TICKETS: "/support/tickets";
        readonly TICKET: (n: string) => string;
        readonly TICKET_MESSAGES: (n: string) => string;
        readonly GUEST: "/support/tickets/guest";
        readonly CAPTCHA: "/support/captcha";
    };
    readonly EXAM: {
        readonly START: "/exam/start";
        readonly SESSIONS: "/exam/sessions";
        readonly QUESTIONS: (id: string) => string;
        readonly ANSWER: (id: string) => string;
        readonly ANSWER_BULK: (id: string) => string;
        readonly SUBMIT: (id: string) => string;
        readonly REVIEW: (id: string) => string;
    };
    readonly STATS: {
        readonly OVERVIEW: "/stats/overview";
        readonly SUBJECT_BREAKDOWN: "/stats/subject-breakdown";
        readonly DIFFICULTY_BREAKDOWN: "/stats/difficulty-breakdown";
        readonly PROGRESS: "/stats/progress-over-time";
        readonly WEAK_AREAS: "/stats/weak-areas";
        readonly LEADERBOARD: "/stats/leaderboard";
        /** @deprecated kept for the dashboard quick-stats card */
        readonly SUMMARY: "/stats/summary";
    };
    readonly CONTACT: "/contact";
    readonly ANNOUNCEMENTS: "/announcements";
    readonly STATUS: "/status";
    readonly PAYMENT: {
        readonly CONFIG: "/payment/config";
        readonly MANUAL_SUBMIT: "/payment/manual/submit";
        readonly MANUAL_SUBMISSIONS: "/payment/manual/submissions";
        readonly MANUAL_SUBMISSION: (submissionNumber: string) => string;
        readonly MANUAL_CANCEL: (submissionNumber: string) => string;
        readonly PANGMERYENDA_INITIATE: "/payment/pangmeryenda/initiate";
        readonly PANGMERYENDA_STATUS: (transactionId: string) => string;
        readonly PANGMERYENDA_WEBHOOK: "/payment/pangmeryenda/webhook";
        readonly PANGMERYENDA_SUCCESS: "/payment/pangmeryenda/success";
    };
};
readonly PANGMERYENDA_FAILED: "/payment/pangmeryenda/failed";
readonly PANGMERYENDA_CANCELLED: "/payment/pangmeryenda/cancelled";
readonly PROMO_VALIDATE: "/payment/promo-code/validate";
readonly PROMO_REDEEM: "/payment/promo-code/redeem";
};
readonly FEATURES: {
    readonly ACCESS: "/features/access";
    readonly CHECK: "/features/check";
    readonly TRACK_USAGE: "/features/track-usage";
};
readonly SUBSCRIPTION: {
    readonly STATUS: "/subscription/status";
    readonly CANCEL: "/subscription/cancel";
};
readonly ADMIN: {
    readonly DASHBOARD: "/admin/dashboard/summary";
    readonly QUESTIONS: "/admin/questions";
    readonly QUESTION: (id: string) => string;
    readonly QUESTIONS_BULK_DELETE: "/admin/questions/bulk-delete";
    readonly QUESTIONS_IMPORT: "/admin/questions/import";
    readonly PASSAGES: "/admin/passages";
    readonly PASSAGE: (id: string) => string;
    readonly USERS: "/admin/users";
    readonly USER: (id: string) => string;
    readonly USER_CREATE: "/admin/users/create";
    readonly USER_DEACTIVATE: (id: string) => string;
    readonly USER_REACTIVATE: (id: string) => string;
    readonly USER_RESET_PASSWORD: (id: string) => string;
    readonly USER_VERIFY_EMAIL: (id: string) => string;
    readonly USERS_EXPORT: "/admin/users/export";
    readonly ANALYTICS: "/admin/analytics";
    readonly EXAMS: "/admin/exams";
    readonly EXAM: (id: string) => string;
    readonly FLAGS: "/admin/content-flags";
    readonly FLAG: (id: string) => string;
    readonly FLAGS_SUMMARY: "/admin/content-flags/summary";
    readonly ANNOUNCEMENTS: "/admin/announcements";
    readonly ANNOUNCEMENT: (id: string) => string;
    readonly SETTINGS: "/admin/settings";
    readonly AUDIT_LOG: "/admin/audit-log";
    readonly AUTH_PROVIDERS: "/admin/auth/providers";
    readonly AUTH_PROVIDER: (p: string) => string;
    readonly AUTH_PROVIDER_TEST: (p: string) => string;
    readonly PAYMENT_CONFIG: "/admin/payment/config";
    readonly PAYMENT_CONFIG_TYPE: "/admin/payment/config/type";
    readonly PAYMENT_CONFIG_PLANS: "/admin/payment/config/plans";
    readonly PAYMENT_CONFIG_MANUAL: "/admin/payment/config/manual";
    readonly PAYMENT_CONFIG_MANUAL_CHANNEL: (channelId: string) => string;
    readonly PAYMENT_CONFIG_MANUAL_CHANNEL_RESET: (channelId: string) => string;
    readonly PAYMENT_CONFIG_PANGMERYENDA: "/admin/payment/config/pangmeryenda";
    readonly PAYMENT_CONFIG_PANGMERYENDA_TEST: "/admin/payment/config/pangmeryenda/test";
    readonly PAYMENT_SUBMISSIONS: "/admin/payment/submissions";
    readonly PAYMENT_SUBMISSION: (submissionNumber: string) => string;
    readonly PAYMENT_SUBMISSION_REVIEW: (submissionNumber: string) => string;
    readonly PAYMENT_SUBMISSION_STATS: "/admin/payment/submissions/stats";
    readonly PAYMENT_REVENUE_REPORT: "/admin/payment/revenue-report";
    readonly FEATURES: "/admin/features";
    readonly FEATURE: (featureId: string) => string;
    readonly FEATURES_BULK: "/admin/features/bulk";
    readonly FEATURES_PREVIEW: "/admin/features/preview";
    readonly PROMO_CODES: "/admin/promo-codes";
    readonly PROMO_CODE: (id: string) => string;
    readonly PROMO_CODES_BATCH: "/admin/promo-codes/generate-batch";
    readonly USER_UPGRADE: (userId: string) => string;
    readonly USER_DOWNGRADE: (userId: string) => string;
    readonly USER_EXTEND: (userId: string) => string;
    readonly SUPPORT_DASHBOARD: "/admin/support/dashboard";
    readonly SUPPORT_TICKETS: "/admin/support/tickets";
    readonly SUPPORT_TICKET: (n: string) => string;
    readonly SUPPORT_TICKET_MESSAGES: (n: string) => string;
    readonly SUPPORT_TICKET_STATUS: (n: string) => string;
    readonly SUPPORT_TICKET_VERIFY: (n: string) => string;
    readonly SUPPORT_MERGE: "/admin/support/merge-accounts";
    readonly DISPUTE: (id: string) => string;
    readonly DATA_REQUESTS: "/admin/data-requests";
    readonly DATA_REQUEST: (id: string) => string;
    readonly DELETION_LOG: "/admin/deletion-log";
    readonly UNLOCK_ACCOUNT: (userId: string) => string;
};
readonly FLAG_QUESTION: (questionId: string) => string;
};
export declare const FLAG_REASONS: readonly [{
    readonly value: "incorrect_answer";
    readonly label: "Incorrect answer";
}, {
    readonly value: "typo";
    readonly label: "Typo or grammatical error";
}, {
    readonly value: "unclear";
    readonly label: "Unclear / Ambiguous wording";
}, {
    readonly value: "other";
    readonly label: "Other";
}];
export declare const ANNOUNCEMENT_TYPES: readonly ["info", "warning", "maintenance"];
export declare const DEFAULT_PLATFORM_SETTINGS: {
    readonly examDefaults: {
        readonly distribution: {
            readonly "Language Proficiency": {
                readonly questions: 25;
                readonly timeLimit: 45;
            };
            readonly Mathematics: {
                readonly questions: 25;
                readonly timeLimit: 45;
            };
            readonly Science: {
                readonly questions: 25;
                readonly timeLimit: 45;
            };
        };
        readonly "Reading Comprehension": {
            readonly questions: 25;
            readonly timeLimit: 45;
        };
        readonly "Writing Skills": {
            readonly questions: 25;
            readonly timeLimit: 45;
        };
    };
    readonly "Language Proficiency": {
        readonly questions: 25;
        readonly timeLimit: 45;
    };
    readonly "Reading Comprehension": {
        readonly questions: 25;
        readonly timeLimit: 45;
    };
    readonly "Writing Skills": {
        readonly questions: 25;
        readonly timeLimit: 45;
    };
};
readonly questions: 30;
readonly timeLimit: 54;
};
readonly Science: {
readonly questions: 25;
readonly timeLimit: 45;
};
readonly "Reading-Comprehension": {
readonly questions: 20;
readonly timeLimit: 36;
};
readonly difficultyMix: {
readonly easy: 25;
readonly medium: 40;
readonly hard: 25;
readonly very_hard: 10;
};
};
readonly registration: {
readonly isOpen: true;
readonly requireEmailVerification: true;
};
readonly leaderboard: {
readonly isEnabled: true;
readonly showFullName: false;
};
readonly maintenance: {
readonly isEnabled: false;
readonly message: "";
};
readonly contact: {
readonly developerEmail: "";
readonly maxMessagesPerHour: 3;
};
};
export declare const DEFAULT_FEATURE_GATING: readonly [{
readonly id: "mock_exam_access";
readonly name: "Mock-Exam-Access";
readonly description: "Start full mock exams.";
readonly category: "exams";
readonly accessLevel: "all";
readonly hasLimit: true;
readonly limits: {
readonly free: 2;
readonly premium: null;
};
readonly limitPeriod: "monthly";
}, {
readonly id: "practice_test_access";
readonly name: "Practice-Test-Access";
readonly description: "Start practice sessions.";
readonly category: "exams";
readonly accessLevel: "all";
readonly hasLimit: true;
readonly limits: {
readonly free: 5;
readonly premium: null;
};
readonly limitPeriod: "daily";
}, {
readonly id: "practice_question_count";
readonly name: "Max Questions per Practice";
readonly description: "Maximum number of questions per practice session.";
readonly category: "exams";
readonly accessLevel: "all";
readonly hasLimit: true;
readonly limits: {
readonly free: 50;
readonly premium: 200;
};
readonly limitPeriod: "total";
}, {
readonly id: "immediate_feedback";
readonly name: "Immediate Feedback Mode";
readonly description: "See correctness immediately.";
readonly category: "practice";
readonly accessLevel: "all";
readonly hasLimit: false;
readonly limits: null;
readonly limitPeriod: null;
}, {
readonly id: "detailed_rationale";
readonly name: "Detailed Answer Rationale";
readonly description: "Read detailed explanation for answers.";
readonly category: "content";
readonly accessLevel: "all";
readonly hasLimit: true;
readonly limits: {
readonly free: 5;
readonly premium: null;
};
readonly limitPeriod: "daily";
}, {
readonly id: "subject_filter";
readonly name: "Subject/Topic Filtering";
readonly description: "Choose specific subjects and topics.";
readonly category: "practice";
readonly accessLevel: "all";
readonly hasLimit: false;
readonly limits: null;
readonly limitPeriod: null;
}, {
readonly id: "difficulty_filter";
readonly name: "Difficulty_Configuration";
readonly description: "Customize_question_difficulty.";
readonly category: "practice";
readonly accessLevel: "all";
readonly hasLimit: true;
readonly limits: {
    readonly free: 3;
    readonly premium: 3;
};
readonly limitPeriod: "total";
}, {
    readonly id: "stats_basic";
    readonly name: "Basic_Statistics";
    readonly description: "Core_progress_metrics.";
    readonly category: "analytics";
    readonly accessLevel: "all";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "stats_advanced";
    readonly name: "Advanced_Analytics_&_Insights";
    readonly description: "Deep_performance_analytics.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "stats_subject_drilldown";
    readonly name: "Subject_Drilldown_Analytics";
    readonly description: "Detailed_per-subject_analytics.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "weak_area_recommendations";
    readonly name: "Weak_Area_Recommendations";
    readonly description: "Personalized_weak_area_recommendations.";
    readonly category: "analytics";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 5;
        readonly premium: null;
    };
    readonly limitPeriod: "weekly";
}, {
    readonly id: "leaderboard_access";
    readonly name: "Leaderboard_Access";
    readonly description: "View_and_compare_rank_with_peers.";
    readonly category: "social";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 1;
        readonly premium: 3;
    };
    readonly limitPeriod: "total";
}, {
    readonly id: "spaced_repetition";
    readonly name: "Spaced_Repetition_Practice";
    readonly description: "Adaptive_spaced_repetition_cards.";
    readonly category: "practice";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 10;
        readonly premium: null;
    };
    readonly limitPeriod: "daily";
}, {
    readonly id: "exam_history_full";
    readonly name: "Full_Exam_History";
    readonly description: "Access_full_historical_exam_records.";
    readonly category: "analytics";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 5;
        readonly premium: null;
    };
    readonly limitPeriod: "total";
}, {
    readonly id: "export_results";
    readonly name: "Export_Results_(PDF/CSV)";
    readonly description: "Export_analytics_and_score_reports.";
    readonly category: "content";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "ad_free";
    readonly name: "Ad_Free_Experience";
    readonly description: "Hide_all_ad_placements.";
    readonly category: "experience";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
},
readonly id: "priority_support";
readonly name: "Priority-Support-Tickets";
readonly description: "Get-prioritized-support-queue.";
readonly category: "experience";
readonly accessLevel: "premium";
readonly hasLimit: false;
readonly limits: null;
readonly limitPeriod: null;
}, {
    readonly id: "custom_presets";
    readonly name: "Saved-Practice-Presets";
    readonly description: "Save-custom-practice-presets.";
    readonly category: "practice";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 2;
        readonly premium: null;
    };
    readonly limitPeriod: "total";
}, {
    readonly id: "review_all_questions";
    readonly name: "Review-All-Exam-Questions";
    readonly description: "Review-all-previously-answered-exam-questions.";
    readonly category: "content";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 1;
        readonly premium: null;
    };
    readonly limitPeriod: "total";
}, {
    readonly id: "predicted_score";
    readonly name: "Predicted-UPCAT-Score";
    readonly description: "Predicted-UPCAT-score-analytics.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "percentile_ranking";
    readonly name: "Percentile-Ranking";
    readonly description: "Percentile-view-on-leaderboard.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "video_ad_skip";
    readonly name: "Skip-Video-Ads";
    readonly description: "Bypass-interstitial-video-ads.";
    readonly category: "experience";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "blog_full_access";
    readonly name: "Full-Blog-Article-Access";
    readonly description: "Read-all-blog-content-without-monthly-cap.";
    readonly category: "content";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 3;
        readonly premium: null;
    };
    readonly limitPeriod: "monthly";
};
export declare const DEFAULT_PAYMENT_CONFIG: {
    readonly id: "global";
    readonly activePaymentType: "manual";
    readonly plans: readonly [{
        readonly id: "30_days";
        readonly name: "1-Month-Premium";
        readonly duration: 30;
        readonly isLifetime: false;
        readonly price: 99;
        readonly currency: "PHP";
        readonly originalPrice: null;
        readonly description: "Full-access-for-30-days";
        readonly isPopular: true;
        readonly isActive: true;
        readonly features: readonly ["Unlimited-mock-exams", "No-ads", "Advanced-analytics", "Priority-support"];
        readonly order: 1;
    }, {
        readonly id: "90_days";
        readonly name: "3-Months-Premium";
        readonly duration: 90;
        readonly isLifetime: false;
        readonly price: 249;
        readonly currency: "PHP";
        readonly originalPrice: 297;
        readonly description: "Full-access-for-90-days";
        readonly isPopular: false;
        readonly isActive: true;
        readonly features: readonly ["Unlimited-mock-exams", "No-ads", "Advanced-analytics", "Priority-support"];
        readonly order: 2;
    }, {
        readonly id: "180_days";
        readonly name: "6-Months-Premium";
readonly duration: 180;
readonly isLifetime: false;
readonly price: 449;
readonly currency: "PHP";
readonly originalPrice: 594;
readonly description: "Full access for 180 days";
readonly isPopular: false;
readonly isActive: true;
readonly features: readonly ["Unlimited mock exams", "No ads", "Advanced analytics", "Priority support"];
readonly order: 3;
}, {
    readonly id: "365_days";
    readonly name: "1 Year Premium";
    readonly duration: 365;
    readonly isLifetime: false;
    readonly price: 799;
    readonly currency: "PHP";
    readonly originalPrice: 1188;
    readonly description: "Full access for 365 days";
    readonly isPopular: false;
    readonly isActive: true;
    readonly features: readonly ["Unlimited mock exams", "No ads", "Advanced analytics", "Priority support"];
    readonly order: 4;
}], {
    readonly manual: {
        readonly processingTimeMessage: "Payment verification takes up to 12 hours";
        readonly instructionsHeader: "How to Pay";
        readonly instructionsBody: "1. Select your preferred channel. 2. Send the exact amount. 3. Save your transaction reference. 4. Upload a clear screenshot of the payment confirmation.";
        readonly autoDisableThreshold: 90;
        readonly channels: readonly [{
            readonly id: "gcash";
            readonly name: "GCash";
            readonly type: "ewallet";
            readonly icon: "gc";
            readonly enabled: true;
            readonly accountName: "UPCAT Simulator";
            readonly accountNumber: "0917XXXXXXXX";
            readonly bankName: null;
            readonly qrCodeImage: null;
            readonly qrCodeLabel: "Scan to pay via GCash";
            readonly limits: {
                readonly daily: {
                    readonly max: 50000;
                    readonly current: 0;
                    readonly lastResetDate: "1970-01-01";
                };
                readonly monthly: {
                    readonly max: 100000;
                    readonly current: 0;
                    readonly lastResetMonth: "1970-01";
                };
            };
            readonly autoDisabled: false;
            readonly autoDisabledReason: null;
            readonly autoDisabledAt: null;
            readonly additionalNotes: "Include your UPCAT username in transfer notes.";
            readonly order: 1;
        }, {
            readonly id: "may";
            readonly name: "Maya";
            readonly type: "ewallet";
            readonly icon: "m";
            readonly enabled: true;
            readonly accountName: "UPCAT Simulator";
            readonly accountNumber: "0999XXXXXXXX";
            readonly bankName: null;
            readonly qrCodeImage: null;
            readonly qrCodeLabel: "Scan to pay via Maya";
            readonly limits: {
                readonly daily: {
                    readonly max: 50000;
                    readonly current: 0;
                    readonly lastResetDate: "1970-01-01";
                };
                readonly monthly: {
                    readonly max: 100000;
                    readonly current: 0;
                    readonly lastResetMonth: "1970-01";
                };
            };
            readonly autoDisabled: false;
            readonly autoDisabledReason: null;
            readonly autoDisabledAt: null;
            readonly additionalNotes: null;
            readonly order: 2;
        }, {
            readonly id: "bdo";
            readonly name: "BDO";
            readonly type: "bank";
            readonly icon: "b";
            readonly enabled: true;
            readonly accountName: "UPCAT Simulator Inc.";
            readonly accountNumber: "1234-5678-9012";
            readonly bankName: "BDO Unibank";
            readonly qrCodeImage: null;
            readonly qrCodeLabel: null;
            readonly limits: {
                readonly daily: {
                    readonly max: null;
                    readonly current: 0;
                    readonly lastResetDate: "1970-01-01";
                };
                readonly monthly: {

    readonly max: null;
    readonly current: 0;
    readonly lastResetMonth: "1970-01";
  };
  readonly autoDisabled: false;
  readonly autoDisabledReason: null;
  readonly autoDisabledAt: null;
  readonly additionalNotes: null;
  readonly order: 3;
});
readonly pangmeryenda: {
  readonly enabled: false;
  readonly apiBaseUrl: "https://api.pangmeryenda.com";
  readonly apiKey: null;
  readonly apiSecretEnc: null;
  readonly webhookSecret: null;
  readonly merchantId: null;
  readonly planMapping: readonly [];
  readonly successRedirectUrl: "/payment/success";
  readonly failureRedirectUrl: "/payment/failed";
  readonly cancelRedirectUrl: "/payment/cancelled";
  readonly webhookEndpoint: "/api/payment/pangmeryenda/webhook";
};
readonly featureGating: {
  readonly features: readonly [
    {
      readonly id: "mock_exam_access";
      readonly name: "Mock Exam Access";
      readonly description: "Start full mock exams.";
      readonly category: "exams";
      readonly accessLevel: "all";
      readonly hasLimit: true;
      readonly limits: {
        readonly free: 2;
        readonly premium: null;
      };
      readonly limitPeriod: "monthly";
    },
    {
      readonly id: "practice_test_access";
      readonly name: "Practice Test Access";
      readonly description: "Start practice sessions.";
      readonly category: "exams";
      readonly accessLevel: "all";
      readonly hasLimit: true;
      readonly limits: {
        readonly free: 5;
        readonly premium: null;
      };
      readonly limitPeriod: "daily";
    },
    {
      readonly id: "practice_question_count";
      readonly name: "Max Questions per Practice";
      readonly description: "Maximum number of questions per practice session.";
      readonly category: "exams";
      readonly accessLevel: "all";
      readonly hasLimit: true;
      readonly limits: {
        readonly free: 50;
        readonly premium: 200;
      };
      readonly limitPeriod: "total";
    },
    {
      readonly id: "immediate_feedback";
      readonly name: "Immediate Feedback Mode";
      readonly description: "See correctness immediately.";
      readonly category: "practice";
      readonly accessLevel: "all";
      readonly hasLimit: false;
      readonly limits: null;
      readonly limitPeriod: null;
    },
    {
      readonly id: "detailed_rationale";
      readonly name: "Detailed Answer Rationale";
      readonly description: "Read detailed explanation for answers.";
      readonly category: "content";
      readonly accessLevel: "all";
      readonly hasLimit: true;
      readonly limits: {
        readonly free: 5;
        readonly premium: null;
      };
      readonly limitPeriod: "daily";
    },
    {
      readonly id: "subject_filter";
      readonly name: "Subject/Topic Filtering";
      readonly description: "Choose specific subjects and topics.";
      readonly category: "practice";
      readonly accessLevel: "all";
      readonly hasLimit: false;
      readonly limits: null;
      readonly limitPeriod: null;
    },
    {
      readonly id: "difficulty_filter";
      readonly name: "Difficulty Configuration";
      readonly description: "Customize question difficulty.";
      readonly category: "practice";
      readonly accessLevel: "all";
      readonly hasLimit: true;
      readonly limits: {
        readonly free: 1;
        readonly premium: 3;
      };
      readonly limitPeriod: "total";
    }
  ];
};
, {
    readonly id: "stats_basic";
    readonly name: "Basic Statistics";
    readonly description: "Core progress metrics.";
    readonly category: "analytics";
    readonly accessLevel: "all";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "stats_advanced";
    readonly name: "Advanced Analytics & Insights";
    readonly description: "Deep performance analytics.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "stats_subject_drilldown";
    readonly name: "Subject Drilldown Analytics";
    readonly description: "Detailed per subject analytics.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "weak_area_recommendations";
    readonly name: "Weak Area Recommendations";
    readonly description: "Personalized weak area recommendations.";
    readonly category: "analytics";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 5;
        readonly premium: null;
    };
    readonly limitPeriod: "weekly";
}, {
    readonly id: "leaderboard_access";
    readonly name: "Leaderboard Access";
    readonly description: "View and compare rank with peers.";
    readonly category: "social";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 1;
        readonly premium: 3;
    };
    readonly limitPeriod: "total";
}, {
    readonly id: "spaced_repetition";
    readonly name: "Spaced Repetition Practice";
    readonly description: "Adaptive spaced repetition cards.";
    readonly category: "practice";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 10;
        readonly premium: null;
    };
    readonly limitPeriod: "daily";
}, {
    readonly id: "exam_history_full";
    readonly name: "Full Exam History";
    readonly description: "Access full historical exam records.";
    readonly category: "analytics";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 5;
        readonly premium: null;
    };
    readonly limitPeriod: "total";
}, {
    readonly id: "export_results";
    readonly name: "Export Results (PDF/CSV)";
    readonly description: "Export analytics and score reports.";
    readonly category: "content";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "ad_free";
    readonly name: "Ad Free Experience";
    readonly description: "Hide all ad placements.";
    readonly category: "experience";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "priority_support";
    readonly name: "Priority Support Tickets";
    readonly description: "Get prioritized support queue.";
    readonly category: "experience";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "custom_presets";

readonly name: "Saved-Practice-Presets";
readonly description: "Save-custom-practice-presets.";
readonly category: "practice";
readonly accessLevel: "all";
readonly hasLimit: true;
readonly limits: {
    readonly free: 2;
    readonly premium: null;
};
readonly limitPeriod: "total";
}, {
    readonly id: "review_all_questions";
    readonly name: "Review All Exam Questions";
    readonly description: "Review all previously answered exam questions.";
    readonly category: "content";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 1;
        readonly premium: null;
    };
    readonly limitPeriod: "total";
}, {
    readonly id: "predicted_score";
    readonly name: "Predicted UPCAT Score";
    readonly description: "Predicted UPCAT score analytics.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "percentile_ranking";
    readonly name: "Percentile Ranking";
    readonly description: "Percentile view on leaderboard.";
    readonly category: "analytics";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "video_ad_skip";
    readonly name: "Skip Video Ads";
    readonly description: "Bypass interstitial video ads.";
    readonly category: "experience";
    readonly accessLevel: "premium";
    readonly hasLimit: false;
    readonly limits: null;
    readonly limitPeriod: null;
}, {
    readonly id: "blog_full_access";
    readonly name: "Full Blog Article Access";
    readonly description: "Read all blog content without monthly cap.";
    readonly category: "content";
    readonly accessLevel: "all";
    readonly hasLimit: true;
    readonly limits: {
        readonly free: 3;
        readonly premium: null;
    };
    readonly limitPeriod: "monthly";
};
};
readonly updatedAt: string;
readonly updatedBy: null;
};
export declare const CONTACT_SUBJECTS: readonly ["General Inquiry", "Bug Report", "Feature Request", "Content Issue", "Other"];
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];
export declare const CONTACT_LIMITS: {
    readonly nameMax: 100;
    readonly emailMax: 200;
    readonly messageMin: 10;
    readonly messageMax: 5000;
    readonly maxPerHour: 3;
};
export declare const SOCIAL_PROVIDERS: readonly ["google", "linkedin", "facebook"];
export declare const SOCIAL_PROVIDER_META: Record<(typeof SOCIAL_PROVIDERS)[number], {
    label: string;
    brandColor: string;
    defaultScopes: string[];
}>
export declare const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";
/**
 * Codes are XXXX-XXXX-XXXX, alphanumeric, excluding ambiguous characters.
 */
export declare const RECOVERY_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export declare const RECOVERY_CODE_COUNT = 10;
/**
 * 15 minutes for recovery JWTs issued by the verify endpoints.
 */
export declare const RECOVERY_TOKEN_TTL_SECONDS: number;
/**
 * Pre-defined questions available to the user (must be exactly 3 chosen).
 */
export declare const SECURITY_QUESTION_BANK: readonly ["What was the name of your first pet?", "What elementary school did you attend?", "What is your mother's maiden name?", "What city were you born in?", "What was your childhood nickname?", "What was the name of your first teacher?", "What is the make of your first car?", "What is your favorite book?", "What was the name of the street you grew up on?", "In what city did your parents meet?"];
export declare const SECURITY_QUESTIONS_REQUIRED = 3;
/**
 * Login lockout thresholds.
 */
export declare const LOGIN_LOCKOUT: {
    readonly softThreshold: 5;
    readonly softDurationMs: number;
    readonly mediumThreshold: 10;
    readonly mediumDurationMs: number;
    readonly hardThreshold: 20;
    /**
     * Indefinite lock = year 9999.
     */
    readonly hardUntil: string;
};
export declare const SUPPORT_TICKET_TYPES: readonly ["account_recovery", "identity_dispute", "data_export", "data_deletion", "account_merge", "general_support"];
export declare const SUPPORT_TICKET_TYPE_META: Record<(typeof SUPPORT_TICKET_TYPES)[number], {
    label: string;
    description: string;
    category: string;
    accessLevel: string;
    hasLimit: boolean;
    limits: {
        readonly free: number;
        readonly premium: number;
    };
    limitPeriod: string;
}>
label: string;
description: string;
icon: string;
};
export declare const SUPPORT_TICKET_STATUSES: readonly ["open", "in_progress", "awaiting_user", "resolved", "rejected"];
export declare const SUPPORT_TICKET_PRIORITIES: readonly ["low", "medium", "high", "critical"];
export declare const SUPPORT_TICKET_STATUS_META: Record<(typeof SUPPORT_TICKET_STATUSES)[number], {
    label: string;
    color: string;
}>;
export declare const SUPPORT_TICKET_PRIORITY_META: Record<(typeof SUPPORT_TICKET_PRIORITIES)[number], {
    label: string;
    color: string;
}>;
/** Auto-close threshold for tickets in awaiting_user state. */
export declare const SUPPORT_AUTO_CLOSE_DAYS = 14;
/** Guest support submission rate-limit. */
export declare const SUPPORT_GUEST_RATE: {
    readonly limit: 2;
    readonly windowMs: number;
};
/** Hours an export download URL stays valid. */
export declare const DATA_EXPORT_TTL_HOURS = 24;
/** Days from confirmation to scheduled deletion. */
export declare const DATA_DELETION_GRACE_DAYS = 7;
/** Hours the confirm-email link stays valid. */
export declare const DATA_DELETION_CONFIRM_TTL_HOURS = 48;
export declare const INACTIVITY_REMINDER_DAYS = 365;
export declare const INACTIVITY_FLAG_DAYS = 730;
export declare const CRON_SCHEDULES: {
    readonly executePendingDeletions: "0 * * * *";
    readonly cleanupExpiredExports: "0 */6 * * *";
    readonly autoCloseStaleTickets: "0 3 * * *";
    readonly accountInactivityCheck: "0 4 * * 0";
};
export declare const MAX_LEVEL = 100;
/** XP required to *reach* a given level (cumulative). */
export declare function xpRequiredForLevel(level: number): number;
/** Compute level + bounds + title from a raw XP total. */
export declare function levelFromXp(xp: number): {
    level: number;
    title: string;
    xpForCurrent: number;
    xpForNext: number;
    xpToNextLevel: number;
};
export declare function titleForLevel(level: number): string;
/** Streak multiplier thresholds (inclusive lower bound). */
export declare const STREAK_MULTIPLIER_TIERS: readonly [{
    readonly minDays: 30;
    readonly multiplier: 2;
}, {
    readonly minDays: 14;
    readonly multiplier: 1.75;
}, {
    readonly minDays: 7;
    readonly multiplier: 1.5;
}, {
    readonly minDays: 3;
    readonly multiplier: 1.25;
}, {
    readonly minDays: 0;
    readonly multiplier: 1;
}];
export declare function streakMultiplier(days: number): number;
/** Base XP rewards (also exposed via platform_settings.gamification.xp). */
export declare const XP_REWARDS: {
    readonly EXAM_COMPLETED: 50;
    readonly PER_CORRECT: 2;
    readonly SCORE_ABOVE_80: 25;
    readonly SCORE_ABOVE_90: 50;
    readonly PERFECT_SCORE: 200;
    readonly PERFECT_SUBJECT: 30;
    readonly FIRST_EXAM: 100;
    readonly DAILY_LOGIN: 10;
    readonly REVIEW_ALL_INCORRECT: 20;
    readonly PRACTICE_COMPLETED: 30;
    readonly PRACTICE_PER_CORRECT: 2;
};
export declare const ACHIEVEMENT_CATEGORIES: readonly ["milestone", "performance", "streak", "dedication", "mastery", "social"];
export declare const ACHIEVEMENT_RARITIES: readonly ["common", "uncommon", "rare", "epic", "legendary"];
export declare const ACHIEVEMENT_RARITY_META: Record<(typeof ACHIEVEMENT_RARITIES)[number], {
    label: string;
    color: string;
    glow: string;
}>;
export declare const ACHIEVEMENT_CATEGORY_META: Record<(typeof ACHIEVEMENT_CATEGORIES)[number], {
    label: string;
    icon: string;
}>;
export declare const SRS_DEFAULT_EASE = -2.5;
export declare const SRS_MIN_EASE = -1.3;
export declare const SRS_MASTERY_INTERVAL_DAYS = 30;
export declare const SRS_MASTERY_EASE = -2.5;
export declare const PRACTICE_DEFAULTS: {
    readonly maxQuestions: 20;
    readonly newCardsLimit: 5;
    readonly includeNew: true;
};
export declare const PRACTICE_MODES: readonly ["review", "weak_areas", "subject_focus", "mixed", "random"];
export declare const PWA_INSTALL_DISMISS_DAYS = 7;
export declare const PWA_INSTALL_MIN_VISITS = 3;
export declare const OFFLINE_PREFETCH_LIMIT_DEFAULT = 100;
export declare const PUSH_NOTIFICATION_TYPES: readonly ["daily_reminder", "streak_alert", "achievement", "weekly_challenge", "announcement"];
readonly endpoints: {
    readonly "POST /api/auth/login": {
        readonly perIp: {
            readonly perMinute: 5;
            readonly perHour: 20;
        };
    };
    readonly "POST /api/auth/register": {
        readonly perIp: {
            readonly perMinute: 3;
            readonly perHour: 10;
        };
    };
    readonly "POST /api/auth/forgot-password": {
        readonly perIp: {
            readonly perMinute: 3;
            readonly perHour: 5;
        };
    };
    readonly "POST /api/auth/recovery-codes/verify": {
        readonly perIp: {
            readonly perMinute: 5;
            readonly perHour: 15;
        };
    };
    readonly "POST /api/auth/security-questions/verify": {
        readonly perIp: {
            readonly perMinute: 3;
            readonly perHour: 10;
        };
    };
    readonly "POST /api/exam/start": {
        readonly perUser: {
            readonly perMinute: 2;
            readonly perHour: 10;
        };
    };
    readonly "GET /api/exam/questions": {
        readonly perUser: {
            readonly perMinute: 30;
        };
    };
    readonly "POST /api/exam/answer": {
        readonly perUser: {
            readonly perMinute: 60;
        };
    };
    readonly "POST /api/exam/answer-bulk": {
        readonly perUser: {
            readonly perMinute: 10;
        };
    };
    readonly "POST /api/support/tickets/guest": {
        readonly perIp: {
            readonly perMinute: 1;
            readonly perHour: 3;
        };
    };
    readonly "POST /api/contact": {
        readonly perIp: {
            readonly perMinute: 1;
            readonly perHour: 3;
        };
    };
    readonly "POST /api/auth/social/start": {
        readonly perIp: {
            readonly perMinute: 10;
            readonly perHour: 30;
        };
    };
    readonly "GET /api/stats": {
        readonly perUser: {
            readonly perMinute: 20;
        };
    };
    readonly "GET /api/admin": {
        readonly perUser: {
            readonly perMinute: 60;
        };
    };
};
readonly botDetection: {
    readonly enabled: true;
    readonly captchaThreshold: 50;
    readonly blockThreshold: 85;
    readonly honeypotEnabled: true;
    readonly fingerprintingEnabled: true;
    readonly behavioralAnalysisEnabled: true;
};
readonly dos: {
    readonly enabled: true;
    readonly globalRpsThreshold: 1000;
    readonly perIpSpikeMultiplier: 5;
    readonly slowlorisTimeout: 30;
    readonly maxConcurrentPerIp: 50;
    readonly maxRequestBodySize: 1048576;
    readonly maxUrlLength: 2048;
};
readonly anomalyDetection: {
    readonly enabled: true;
    readonly impossibleTravelEnabled: true;
    readonly impossibleTravelThresholdMax: 500;
    readonly impossibleTravelThresholdMin: 30;
};
readonly unusualHoursEnabled: false;
readonly newDeviceAlertEnabled: true;
};
readonly autoResponse: {
    readonly autoBlockEnabled: true;
    readonly autoBlockDuration: 3600;
    readonly escalationThresholds: {
        readonly softBlock: 70;
        readonly hardBlock: 90;
        readonly permanentBlock: 95;
    };
    readonly notifyAdminOnCritical: true;
    readonly cooldownPeriod: 300;
};
readonly headers: {
    readonly hsts: {
        readonly enabled: true;
        readonly maxAge: 31536000;
        readonly includeSubDomains: true;
    };
    readonly csp: {
        readonly defaultSrc: readonly ['self'];
        readonly scriptSrc: readonly ['self'];
        readonly styleSrc: readonly ['self', 'unsafe-inline'];
        readonly imgSrc: readonly ['self', 'data', 'https'];
        readonly connectSrc: readonly ['self'];
        readonly fontSrc: readonly ['self', 'data'];
        readonly frameSrc: readonly ['none'];
        readonly objectSrc: readonly ['none'];
        readonly baseUri: readonly ['self'];
    };
    readonly xFrameOptions: "DENY";
    readonly xContentTypeOptions: "nosniff";
    readonly referrerPolicy: "strict-origin-when-cross-origin";
    readonly permissionsPolicy: "camera=(), microphone=(), geolocation=()";
};
readonly lockdown: {
    readonly enabled: false;
    readonly enabledAt: null;
    readonly enabledBy: null;
    readonly reason: null;
};
readonly updatedAt: string;
readonly updatedBy: null;
};
export declare const API_ROUTES_V15: {
    readonly CAPTCHA: {
        readonly GENERATE: "/captcha/generate";
        readonly VERIFY: "/captcha/verify";
    };
    readonly ACCOUNT: {
        readonly SESSIONS: "/account/security/sessions";
        readonly SESSION_REVOKE: (id: string) => string;
        readonly SESSIONS_REVOKE_ALL: "/account/security/sessions/revoke-all";
        readonly ACTIVITY: "/account/security/activity";
    };
    readonly ADMIN: {
        readonly DASHBOARD: "/admin/security/dashboard";
        readonly EVENTS: "/admin/security/events";
        readonly EVENT: (id: string) => string;
        readonly EVENT_REVIEW: (id: string) => string;
        readonly IPS: "/admin/security/ips";
        readonly IP: (ip: string) => string;
        readonly IP_BLOCK: (ip: string) => string;
        readonly IP_UNBLOCK: (ip: string) => string;
        readonly IP_BLOCK_RANGE: "/admin/security/ips/block-range";
        readonly BLOCKED: "/admin/security/blocked";
        readonly BLOCKED_ITEM: (id: string) => string;
        readonly CONFIG: "/admin/security/config";
        readonly LOCKDOWN_ENABLE: "/admin/security/emergency/lockdown";
        readonly LOCKDOWN_DISABLE: "/admin/security/emergency/unlock";
        readonly REPORTS: "/admin/security/reports/attack-summary";
    };
};
export declare const CRON_SCHEDULES_V15: {
    readonly threatScoreDecay: "0 * * * *";
    readonly expiredBlocksCleanup: "*/15 * * * *";
    readonly securityReport: "0 0 * * *";
    readonly staleSessionCleanup: "0 */6 * * *";
    readonly ipIntelligenceAggregation: "30 0 * * *";
};
export declare const RATE_LIMIT_BUCKET_TTL_SECONDS = 86400;
export declare const USER_SESSION_RETENTION_DAYS = 30;
/**
 * Rate-limit windows in milliseconds, matching the perMinute/perHour/perDay keys.
 */
export declare const RATE_WINDOWS: {
    readonly perMinute: 60000;
    readonly perHour: 3600000;
    readonly perDay: 86400000;
};
export declare const CAPTCHA_TYPES: readonly ["math", "image", "puzzle", "pow"];
export declare const CAPTCHA_TTL_SECONDS = 600;
export declare const CAPTCHA_TOKEN_TTL_SECONDS = 600;
export declare const CAPTCHA_MAX_ATTEMPTS = 3;
export declare const POW_DIFFICULTY_NORMAL = 4;
export declare const POW_DIFFICULTY_ELEVATED = 6;
export declare const PUZZLE_TOLERANCE_PX = 6;
export declare const PUZZLE_MIN_SOLVE_MS = 300;
export declare const PUZZLE_TRACK_WIDTH = 320;
export declare const PUZZLE_PIECE_SIZE = 40;
export declare const IMAGE_CAPTCHA_GRID_SIZE = 9;
export declare const IMAGE_CAPTCHA_TARGET_MIN = 2;
export declare const IMAGE_CAPTCHA_TARGET_MAX = 4;