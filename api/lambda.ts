/**
 * AWS Lambda entry point.
 *
 * Wraps the existing Vercel-style handlers with serverless-http and routes incoming API Gateway events to the same files that Vercel serves under /api. This lets one codebase target both platforms.
 */
import express, { type Request, type Response } from "express";
import serverless from "serverless-http";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestMonitoringMiddleware } from "./src/monitoring/context.js";
import { maintenanceMiddleware } from "./src/maintenanceMiddleware.js";

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

/**
 * Bridge between an Express (req,res) and the Vercel-style handler signature. Merges Express path params (req.params) into req.query so that Vercel-style handlers can read them uniformly via req.query.
 */
function adapt(handler: Handler) {
  return (req: Request, res: Response) => {
    const startedAt = Date.now();

    console.log("[lambda] request:start", {
      method: req.method,
      path: req.path,
      url: req.originalUrl ?? req.url,
      query: req.query,
      params: req.params,
    });

    // Merge path params into query so handlers can read e.g. req.query.id
    const expressReq = req as Request & { params?: Record<string, string> };
    if (expressReq.params) {
      Object.assign(expressReq.query as Record<string, unknown>, expressReq.params);
    }

    res.on("finish", () => {
      console.log("[lambda] request:end", {
        method: req.method,
        path: req.path,
        url: req.originalUrl ?? req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    return Promise.resolve(
      handler(req as unknown as VercelRequest, res as unknown as VercelResponse),
    ).catch((err) => {
      console.error("[lambda] unhandled handler error", {
        method: req.method,
        path: req.path,
        url: req.originalUrl ?? req.url,
        error:
          err instanceof Error
            ? {
                name: err.name,
                message: err.message,
                stack: err.stack,
              }
            : err,
      });

      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    });
  };
}


/**
 * Lazy handler: accepts a dynamic import() and caches the resolved default export after the first invocation. Modules are only loaded when their route is first hit, keeping process startup near-instant.
 */
function lazy(load: () => Promise<{ default: Handler }>): Handler {
  let cached: Handler | null = null;
  return async (req, res) => {
    if (!cached) cached = (await load()).default;
    return cached(req, res);
  };
}

export const app = express();
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: string }).rawBody = buf.toString("utf8");
    },
  }),
);
app.use(requestMonitoringMiddleware);
app.use(maintenanceMiddleware);

// Auth
const register = lazy(() => import("./functions/auth/register.js"));
const login = lazy(() => import("./functions/auth/login.js"));
const me = lazy(() => import("./functions/auth/me.js"));
const providers = lazy(() => import("./functions/auth/providers.js"));
const verifyEmail = lazy(() => import("./functions/auth/verify-email.js"));
const forgotPassword = lazy(() => import("./functions/auth/forgot-password.js"));
const resetPassword = lazy(() => import("./functions/auth/reset-password.js"));
const linkedAccounts = lazy(() => import("./functions/auth/linked-accounts.js"));
const unlinkAccount = lazy(() => import("./functions/auth/unlink.js"));
const setPassword = lazy(() => import("./functions/auth/set-password.js"));
const socialStart = lazy(() => import("./functions/auth/social/start.js"));
const socialCallback = lazy(() => import("./functions/auth/social/callback.js"));
const recoveryCodes = lazy(() => import("./functions/auth/recovery-codes.js"));

app.post("/api/auth/register", adapt(register));
app.post("/api/auth/login", adapt(login));
app.get("/api/auth/me", adapt(me));
app.get("/api/auth/providers", adapt(providers));
app.post("/api/auth/verify-email", adapt(verifyEmail));
app.post("/api/auth/forgot-password", adapt(forgotPassword));
app.post("/api/auth/reset-password", adapt(resetPassword));
app.get("/api/auth/linked-accounts", adapt(linkedAccounts));
app.post("/api/auth/unlink", adapt(unlinkAccount));
app.post("/api/auth/set-password", adapt(setPassword));
app.post("/api/auth/social/:provider/start", adapt(socialStart));
app.post("/api/auth/social/:provider/callback", adapt(socialCallback));

// Recovery codes
app.post("/api/auth/recovery-codes/generate", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "generate" });
  return adapt(recoveryCodes)(req as never, res as never);
});
app.get("/api/auth/recovery-codes/status", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "status" });
  return adapt(recoveryCodes)(req as never, res as never);
});
app.post("/api/auth/recovery-codes/verify", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "verify" });
  return adapt(recoveryCodes)(req as never, res as never);
});

// Exam
const examStart = lazy(() => import("./functions/exam/start.js"));
const examSessions = lazy(() => import("./functions/exam/sessions.js"));
const examQuestions = lazy(() => import("./functions/exam/questions.js"));
const examAnswer = lazy(() => import("./functions/exam/answer.js"));
const examAnswerBulk = lazy(() => import("./functions/exam/answer-bulk.js"));
const examPause = lazy(() => import("./functions/exam/pause.js"));
const examSubmit = lazy(() => import("./functions/exam/submit.js"));
const examReview = lazy(() => import("./functions/exam/review.js"));
const examFlag = lazy(() => import("./functions/exam/flag.js"));

app.post("/api/exam/start", adapt(examStart));
app.get("/api/exam/sessions", adapt(examSessions));
app.get("/api/exam/:sessionId/questions", adapt(examQuestions));
app.post("/api/exam/:sessionId/answer", adapt(examAnswer));
app.post("/api/exam/:sessionId/answer-bulk", adapt(examAnswerBulk));

app.post("/api/exam/:sessionId/pause", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "pause" });
  return adapt(examPause)(req as never, res as never);
});

app.post("/api/exam/:sessionId/resume", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "resume" });
  return adapt(examPause)(req as never, res as never);
});

app.post("/api/exam/:sessionId/submit", adapt(examSubmit));
app.get("/api/exam/:sessionId/review", adapt(examReview));
app.post("/api/exam/questions/:questionId/flag", adapt(examFlag));

// Stats
const statsOverview = lazy(() => import("./functions/stats/overview.js"));
const statsSummary = lazy(() => import("./functions/stats/summary.js"));
const statsLeaderboard = lazy(() => import("./functions/stats/leaderboard.js"));
const statsWeakAreas = lazy(() => import("./functions/stats/weak-areas.js"));
const statsProgress = lazy(() => import("./functions/stats/progress-over-time.js"));
const statsSubject = lazy(() => import("./functions/stats/subject-breakdown.js"));
const statsDifficulty = lazy(() => import("./functions/stats/difficulty-breakdown.js"));

app.get("/api/stats/overview", adapt(statsOverview));
app.get("/api/stats/summary", adapt(statsSummary));
app.get("/api/stats/leaderboard", adapt(statsLeaderboard));
app.get("/api/stats/weak-areas", adapt(statsWeakAreas));
app.get("/api/stats/progress-over-time", adapt(statsProgress));
app.get("/api/stats/subject-breakdown", adapt(statsSubject));
app.get("/api/stats/difficulty-breakdown", adapt(statsDifficulty));

// Announcements
const announcements = lazy(() => import("./functions/announcements.js"));
app.get("/api/announcements", adapt(announcements));

// Gamification
const gamificationProfile = lazy(() => import("./functions/gamification/profile.js"));
const gamificationAchievements = lazy(() => import("./functions/gamification/achievements.js"));
const gamificationLeaderboard = lazy(() => import("./functions/gamification/leaderboard.js"));
const gamificationWeeklyChallenge = lazy(() => import("./functions/gamification/weekly-challenge.js"));
const gamificationDismissNotifications = lazy(() => import("./functions/gamification/dismiss-notifications.js"));

app.get("/api/gamification/profile", adapt(gamificationProfile));
app.get("/api/gamification/achievements", adapt(gamificationAchievements));
app.get("/api/gamification/leaderboard", adapt(gamificationLeaderboard));
app.get("/api/gamification/weekly-challenge", adapt(gamificationWeeklyChallenge));
app.post("/api/gamification/weekly-challenge", adapt(gamificationWeeklyChallenge));
app.post("/api/gamification/dismiss-notifications", adapt(gamificationDismissNotifications));

// Practice
const practiceStart = lazy(() => import("./functions/practice/start.js"));
const practiceAnswer = lazy(() => import("./functions/practice/answer.js"));
const practiceRate = lazy(() => import("./functions/practice/rate.js"));
const practiceComplete = lazy(() => import("./functions/practice/complete.js"));
const practiceStats = lazy(() => import("./functions/practice/stats.js"));
const practiceCards = lazy(() => import("./functions/practice/cards.js"));
const practiceBootstrap = lazy(() => import("./functions/practice/bootstrap.js"));

app.post("/api/practice/start", adapt(practiceStart));
app.post("/api/practice/bootstrap", adapt(practiceBootstrap));

app.post("/api/practice/:sessionId/answer", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { sessionId: req.params.sessionId });
  return adapt(practiceAnswer)(req as never, res as never);
});

app.post("/api/practice/:sessionId/rate", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { sessionId: req.params.sessionId });
  return adapt(practiceRate)(req as never, res as never);
});

app.post("/api/practice/:sessionId/complete", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { sessionId: req.params.sessionId });
  return adapt(practiceComplete)(req as never, res as never);
});

app.get("/api/practice/stats", adapt(practiceStats));
app.get("/api/practice/cards", adapt(practiceCards));

// Study Plan
const studyPlanDiagnostic = lazy(() => import("./functions/study-plan/diagnostic.js"));
const studyPlanPlans = lazy(() => import("./functions/study-plan/plans.js"));
const studyPlanAssessments = lazy(() => import("./functions/study-plan/assessments.js"));
const studyPlanAdmin = lazy(() => import("./functions/study-plan/admin.js"));

app.post("/api/study-plan/diagnostic/start", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "start" });
  return adapt(studyPlanDiagnostic)(req as never, res as never);
});

app.get("/api/study-plan/diagnostic/:id/questions", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id, action: "questions" });
  return adapt(studyPlanDiagnostic)(req as never, res as never);
});

app.post("/api/study-plan/diagnostic/:id/submit-section", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id, action: "submit-section" });
  return adapt(studyPlanDiagnostic)(req as never, res as never);
});

app.post("/api/study-plan/diagnostic/:id/complete", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "complete" });
  return adapt(studyPlanDiagnostic)(req as never, res as never);
});

app.post("/api/study-plan/diagnostic/skip", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "skip" });
  return adapt(studyPlanDiagnostic)(req as never, res as never);
});

app.get("/api/study-plan/templates", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "templates" });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.post("/api/study-plan/generate", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "generate" });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.get("/api/study-plan/active", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "active" });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.get("/api/study-plan/calendar", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "calendar" });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.get("/api/study-plan/:planId", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { planId: req.params.planId, action: "detail" });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.get("/api/study-plan/:planId/today", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { planId: req.params.planId, action: "today" });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.get("/api/study-plan/:planId/session/:sessionId", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    planId: req.params.planId,
    sessionId: req.params.sessionId,
    action: "session",
  });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.post("/api/study-plan/:planId/session/:sessionId/activity/:activityId/start", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    planId: req.params.planId,
    sessionId: req.params.sessionId,
    activityId: req.params.activityId,
    action: "activity-start",
  });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.post("/api/study-plan/:planId/session/:sessionId/activity/:activityId/complete", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    planId: req.params.planId,
    sessionId: req.params.sessionId,
    activityId: req.params.activityId,
    action: "activity-complete",
  });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.post("/api/study-plan/:planId/session/:sessionId/skip", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    planId: req.params.planId,
    sessionId: req.params.sessionId,
    action: "session-skip",
  });
  return adapt(studyPlanPlans)(req as never, res as never);
});

app.post("/api/study-plan/:planId/module/:moduleId/assessment/start", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    planId: req.params.planId,
    moduleId: req.params.moduleId,
    action: "module-assessment-start",
  });
  return adapt(studyPlanAssessments)(req as never, res as never);
});

app.get("/api/study-plan/assessment/:assessmentSessionId/questions", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    assessmentSessionId: req.params.assessmentSessionId,
    action: "assessment-questions",
  });
  return adapt(studyPlanAssessments)(req as never, res as never);
});

app.post("/api/study-plan/assessment/:assessmentSessionId/answer", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    assessmentSessionId: req.params.assessmentSessionId,
    action: "assessment-answer",
  });
  return adapt(studyPlanAssessments)(req as never, res as never);
});

app.post("/api/study-plan/assessment/:assessmentSessionId/submit", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    assessmentSessionId: req.params.assessmentSessionId,
    action: "assessment-submit",
  });
  return adapt(studyPlanAssessments)(req as never, res as never);
});

app.get("/api/study-plan/assessment/:assessmentSessionId/review", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    assessmentSessionId: req.params.assessmentSessionId,
    action: "assessment-review",
  });
  return adapt(studyPlanAssessments)(req as never, res as never);
});

// Contact
const contact = lazy(() => import("./functions/contact.js"));
app.post("/api/contact", adapt(contact));

// Help center / contextual help / onboarding
const helpArticles = lazy(() => import("./functions/help/articles.js"));
const helpArticleDetail = lazy(() => import("./functions/help/article-detail.js"));
const helpCategories = lazy(() => import("./functions/help/categories.js"));
const helpFeedback = lazy(() => import("./functions/help/feedback.js"));
const helpSearch = lazy(() => import("./functions/help/search.js"));
const helpContextual = lazy(() => import("./functions/help/contextual.js"));
const helpOnboarding = lazy(() => import("./functions/help/onboarding.js"));
const helpOnboardingCheck = lazy(() => import("./functions/help/onboarding-check.js"));
const helpPreferences = lazy(() => import("./functions/help/preferences.js"));

app.get("/api/help/articles", adapt(helpArticles));
app.get("/api/help/articles/:slug", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { slug: req.params.slug });
  return adapt(helpArticleDetail)(req as never, res as never);
});
app.get("/api/help/categories", adapt(helpCategories));
app.post("/api/help/articles/:slug/feedback", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { slug: req.params.slug });
  return adapt(helpFeedback)(req as never, res as never);
});
app.get("/api/help/search", adapt(helpSearch));
app.get("/api/help/contextual", adapt(helpContextual));
app.post("/api/help/contextual/:id/dismiss", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(helpContextual)(req as never, res as never);
});
app.get("/api/help/onboarding/check", adapt(helpOnboardingCheck));
app.get("/api/help/onboarding/:flowId", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { flowId: req.params.flowId });
  return adapt(helpOnboarding)(req as never, res as never);
});
app.post("/api/help/onboarding/:flowId/complete", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    flowId: req.params.flowId,
    action: "complete",
  });
  return adapt(helpOnboarding)(req as never, res as never);
});
app.post("/api/help/onboarding/:flowId/skip", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    flowId: req.params.flowId,
    action: "skip",
  });
  return adapt(helpOnboarding)(req as never, res as never);
});
app.put("/api/help/preferences", adapt(helpPreferences));

// Push notifications
const pushPublicKey = lazy(() => import("./functions/push/public-key.js"));
const pushSubscribe = lazy(() => import("./functions/push/subscribe.js"));
const pushUnsubscribe = lazy(() => import("./functions/push/unsubscribe.js"));
const pushPreferences = lazy(() => import("./functions/push/preferences.js"));

app.get("/api/push/public-key", adapt(pushPublicKey));
app.post("/api/push/subscribe", adapt(pushSubscribe));
app.post("/api/push/unsubscribe", adapt(pushUnsubscribe));
app.get("/api/push/preferences", adapt(pushPreferences));
app.patch("/api/push/preferences", adapt(pushPreferences));

// Account
const accountSecuritySessions = lazy(() => import("./functions/account/security/sessions.js"));
const accountSecurityActivity = lazy(() => import("./functions/account/security/activity.js"));
const accountEmailPreferences = lazy(() => import("./functions/account/email-preferences.js"));

app.get("/api/account/security/sessions", adapt(accountSecuritySessions));
app.post("/api/account/security/sessions/revoke-all", adapt(accountSecuritySessions));
app.post("/api/account/security/sessions/:id/revoke", adapt(accountSecuritySessions));
app.get("/api/account/security/activity", adapt(accountSecurityActivity));
app.get("/api/account/email-preferences", adapt(accountEmailPreferences));
app.patch("/api/account/email-preferences", adapt(accountEmailPreferences));

// Admin security
const adminSecurityDashboard = lazy(() => import("./functions/admin/security/dashboard.js"));
const adminSecurityEvents = lazy(() => import("./functions/admin/security/events.js"));
const adminSecurityIps = lazy(() => import("./functions/admin/security/ips.js"));
const adminSecurityBlocked = lazy(() => import("./functions/admin/security/blocked.js"));
const adminSecurityConfig = lazy(() => import("./functions/admin/security/config.js"));
const adminSecurityEmergency = lazy(() => import("./functions/admin/security/emergency.js"));
const adminSecurityReports = lazy(() => import("./functions/admin/security/reports.js"));

app.get("/api/admin/security/dashboard", adapt(adminSecurityDashboard));
app.get("/api/admin/security/events", adapt(adminSecurityEvents));
app.get("/api/admin/security/events/:id", adapt(adminSecurityEvents));
app.put("/api/admin/security/events/:id/review", adapt(adminSecurityEvents));
app.post("/api/admin/security/ips/block-range", adapt(adminSecurityIps));
app.post("/api/admin/security/ips/:ip", adapt(adminSecurityIps));
app.post("/api/admin/security/ips/ip/block", adapt(adminSecurityIps));
app.post("/api/admin/security/ips/:ip/unblock", adapt(adminSecurityIps));
app.get("/api/admin/security/blocked", adapt(adminSecurityBlocked));
app.post("/api/admin/security/blocked", adapt(adminSecurityBlocked));
app.delete("/api/admin/security/blocked/:id", adapt(adminSecurityBlocked));
app.get("/api/admin/security/config", adapt(adminSecurityConfig));
app.put("/api/admin/security/config", adapt(adminSecurityConfig));
app.post("/api/admin/security/emergency/lockdown", adapt(adminSecurityEmergency));
app.post("/api/admin/security/emergency/unlock", adapt(adminSecurityEmergency));
app.get("/api/admin/security/reports/attack-summary", adapt(adminSecurityReports));

// Admin dashboard / analytics / audit / auth providers / settings
const adminDashboardSummary = lazy(() => import("./functions/admin/dashboard/summary.js"));
const adminDashboardActivity = lazy(() => import("./functions/admin/dashboard/activity.js"));
const adminAnalytics = lazy(() => import("./functions/admin/analytics.js"));
const adminAuditLog = lazy(() => import("./functions/admin/audit-log.js"));
const adminAuthProviders = lazy(() => import("./functions/admin/auth-providers.js"));
const adminAuthProvidersPublish = lazy(() => import("./functions/admin/auth-providers/publish.js"));
const adminSettings = lazy(() => import("./functions/admin/settings.js"));
const adminAdsPublish = lazy(() => import("./functions/admin/ads/publish.js"));

app.get("/api/admin/dashboard/summary", adapt(adminDashboardSummary));
app.get("/api/admin/dashboard/activity", adapt(adminDashboardActivity));
app.get("/api/admin/analytics", adapt(adminAnalytics));
app.get("/api/admin/audit-log", adapt(adminAuditLog));
app.get("/api/admin/auth/providers", adapt(adminAuthProviders));
app.post("/api/admin/auth/providers/publish", adapt(adminAuthProvidersPublish));
app.get("/api/admin/auth/providers/:provider", adapt(adminAuthProviders));
app.put("/api/admin/auth/providers/:provider", adapt(adminAuthProviders));
app.post("/api/admin/auth/providers/:provider/test", adapt(adminAuthProviders));
app.get("/api/admin/settings", adapt(adminSettings));
app.put("/api/admin/settings", adapt(adminSettings));
app.post("/api/admin/ads/publish", adapt(adminAdsPublish));

// Admin help
const adminHelpArticles = lazy(() => import("./functions/admin/help/articles.js"));
const adminHelpContextual = lazy(() => import("./functions/admin/help/contextual.js"));
const adminHelpOnboarding = lazy(() => import("./functions/admin/help/onboarding.js"));
const adminHelpAnalytics = lazy(() => import("./functions/admin/help/analytics.js"));
const adminHelpPublish = lazy(() => import("./functions/admin/help/publish.js"));

app.get("/api/admin/help/articles", adapt(adminHelpArticles));
app.post("/api/admin/help/articles", adapt(adminHelpArticles));
app.put("/api/admin/help/articles/:slug", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { slug: req.params.slug });
  return adapt(adminHelpArticles)(req as never, res as never);
});
app.delete("/api/admin/help/articles/:slug", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { slug: req.params.slug });
  return adapt(adminHelpArticles)(req as never, res as never);
});
app.get("/api/admin/help/contextual", adapt(adminHelpContextual));
app.post("/api/admin/help/contextual", adapt(adminHelpContextual));
app.put("/api/admin/help/contextual/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(adminHelpContextual)(req as never, res as never);
});
app.get("/api/admin/help/onboarding", adapt(adminHelpOnboarding));
app.put("/api/admin/help/onboarding/:flowId", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { flowId: req.params.flowId });
  return adapt(adminHelpOnboarding)(req as never, res as never);
});
app.get("/api/admin/help/analytics", adapt(adminHelpAnalytics));
app.post("/api/admin/help/publish", adapt(adminHelpPublish));

// Admin data requests
const adminDataRequests = lazy(() => import("./functions/admin/data-requests.js"));
app.get("/api/admin/data-requests", adapt(adminDataRequests));
app.put("/api/admin/data-requests/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(adminDataRequests)(req as never, res as never);
});

// Admin payments / features / promo
const adminPaymentConfig = lazy(() => import("./functions/admin/payment/config.js"));
const adminPaymentSubmissions = lazy(() => import("./functions/admin/payment/submissions.js"));
const adminPaymentRevenueReport = lazy(() => import("./functions/admin/payment/revenue-report.js"));
const adminFeatures = lazy(() => import("./functions/admin/features.js"));
const adminPromoCodes = lazy(() => import("./functions/admin/promo-codes.js"));
const adminUserSubscription = lazy(() => import("./functions/admin/users/subscription.js"));

app.get("/api/admin/payment/config", adapt(adminPaymentConfig));
app.put("/api/admin/payment/config/type", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "type" });
  return adapt(adminPaymentConfig)(req as never, res as never);
});
app.put("/api/admin/payment/config/plans", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "plans" });
  return adapt(adminPaymentConfig)(req as never, res as never);
});
app.put("/api/admin/payment/config/manual", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "manual" });
  return adapt(adminPaymentConfig)(req as never, res as never);
});
app.put("/api/admin/payment/config/manual/channels/:channelId", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    action: "manual",
    channelId: req.params.channelId,
  });
  return adapt(adminPaymentConfig)(req as never, res as never);
});
app.post("/api/admin/payment/config/manual/channels/:channelId/reset-limits", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    action: "manual",
    channelId: req.params.channelId,
    reset: true,
  });
  return adapt(adminPaymentConfig)(req as never, res as never);
});
app.put("/api/admin/payment/config/pangmeryenda", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "pangmeryenda" });
  return adapt(adminPaymentConfig)(req as never, res as never);
});
app.post("/api/admin/payment/config/pangmeryenda/test", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "pangmeryenda-test" });
  return adapt(adminPaymentConfig)(req as never, res as never);
});

app.get("/api/admin/payment/submissions", adapt(adminPaymentSubmissions));
app.get("/api/admin/payment/submissions/stats", adapt(adminPaymentSubmissions));
app.get("/api/admin/payment/submissions/:submissionNumber", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { submissionNumber: req.params.submissionNumber });
  return adapt(adminPaymentSubmissions)(req as never, res as never);
});
app.put("/api/admin/payment/submissions/:submissionNumber/review", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    submissionNumber: req.params.submissionNumber,
    action: "review",
  });
  return adapt(adminPaymentSubmissions)(req as never, res as never);
});

app.get("/api/admin/payment/revenue-report", adapt(adminPaymentRevenueReport));

app.get("/api/admin/features", adapt(adminFeatures));
app.put("/api/admin/features/:featureId", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { featureId: req.params.featureId });
  return adapt(adminFeatures)(req as never, res as never);
});
app.put("/api/admin/features/bulk", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "bulk" });
  return adapt(adminFeatures)(req as never, res as never);
});
app.post("/api/admin/features/preview", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "preview" });
  return adapt(adminFeatures)(req as never, res as never);
});

app.get("/api/admin/promo-codes", adapt(adminPromoCodes));
app.post("/api/admin/promo-codes", adapt(adminPromoCodes));
app.put("/api/admin/promo-codes/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(adminPromoCodes)(req as never, res as never);
});
app.delete("/api/admin/promo-codes/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(adminPromoCodes)(req as never, res as never);
});
app.post("/api/admin/promo-codes/generate-batch", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "batch" });
  return adapt(adminPromoCodes)(req as never, res as never);
});

app.post("/api/admin/users/:userId/upgrade", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { userId: req.params.userId, action: "upgrade" });
  return adapt(adminUserSubscription)(req as never, res as never);
});
app.post("/api/admin/users/:userId/downgrade", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { userId: req.params.userId, action: "downgrade" });
  return adapt(adminUserSubscription)(req as never, res as never);
});
app.post("/api/admin/users/:userId/extend", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { userId: req.params.userId, action: "extend" });
  return adapt(adminUserSubscription)(req as never, res as never);
});

// Admin announcements
const adminAnnouncementsIndex = lazy(() => import("./functions/admin/announcements/index.js"));
const adminAnnouncementsPublish = lazy(() => import("./functions/admin/announcements/publish.js"));

app.get("/api/admin/announcements", adapt(adminAnnouncementsIndex));
app.post("/api/admin/announcements", adapt(adminAnnouncementsIndex));
app.put("/api/admin/announcements/:id", adapt(adminAnnouncementsIndex));
app.delete("/api/admin/announcements/:id", adapt(adminAnnouncementsIndex));
app.post("/api/admin/announcements/publish", adapt(adminAnnouncementsPublish));

// Admin content flags
const adminContentFlagsIndex = lazy(() => import("./functions/admin/content-flags/index.js"));
const adminContentFlagsSummary = lazy(() => import("./functions/admin/content-flags/summary.js"));

app.get("/api/admin/content-flags", adapt(adminContentFlagsIndex));
app.put("/api/admin/content-flags/:id", adapt(adminContentFlagsIndex));
app.get("/api/admin/content-flags/summary", adapt(adminContentFlagsSummary));

// Admin exams / practice sessions
const adminExamsIndex = lazy(() => import("./functions/admin/exams/index.js"));
const adminExamsDetail = lazy(() => import("./functions/admin/exams/detail.js"));
const adminExamsAssignmentHistory = lazy(() => import("./functions/admin/exams/assignment-history.js"));
const adminPracticeSessionsIndex = lazy(() => import("./functions/admin/practice-sessions/index.js"));
const adminPracticeSessionsDetail = lazy(() => import("./functions/admin/practice-sessions/detail.js"));

app.get("/api/admin/exams", adapt(adminExamsIndex));
app.get("/api/admin/exams/users/:userId/assignment-history", adapt(adminExamsAssignmentHistory));
app.get("/api/admin/exams/:id", adapt(adminExamsDetail));
app.delete("/api/admin/exams/:id", adapt(adminExamsDetail));
app.get("/api/admin/practice-sessions", adapt(adminPracticeSessionsIndex));
app.delete("/api/admin/practice-sessions/:id", adapt(adminPracticeSessionsDetail));

// Admin passages
const adminPassagesIndex = lazy(() => import("./functions/admin/passages/index.js"));
const adminPassagesDetail = lazy(() => import("./functions/admin/passages/detail.js"));

app.get("/api/admin/passages", adapt(adminPassagesIndex));
app.post("/api/admin/passages", adapt(adminPassagesIndex));
app.get("/api/admin/passages/:id", adapt(adminPassagesDetail));
app.put("/api/admin/passages/:id", adapt(adminPassagesDetail));
app.delete("/api/admin/passages/:id", adapt(adminPassagesDetail));

// Admin questions
const adminQuestionsIndex = lazy(() => import("./functions/admin/questions/index.js"));
const adminQuestionsDetail = lazy(() => import("./functions/admin/questions/detail.js"));
const adminQuestionsBulkDelete = lazy(() => import("./functions/admin/questions/bulk-delete.js"));
const adminQuestionsImport = lazy(() => import("./functions/admin/questions/import.js"));
const adminQuestionsImportWorkflow = lazy(() => import("./functions/admin/questions/import-workflow.js"));
const adminQuestionsExport = lazy(() => import("./functions/admin/questions/export.js"));
const adminQuestionMediaAssets = lazy(() => import("./functions/admin/questions/media-assets.js"));
const adminQuestionsWorkflow = lazy(() => import("./functions/admin/questions/workflow.js"));

app.get("/api/admin/questions", adapt(adminQuestionsIndex));
app.post("/api/admin/questions", adapt(adminQuestionsIndex));
app.post("/api/admin/questions/bulk-delete", adapt(adminQuestionsBulkDelete));
app.post("/api/admin/questions/import", adapt(adminQuestionsImport));
app.post("/api/admin/questions/import/preview", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "preview" });
  return adapt(adminQuestionsImportWorkflow)(req as never, res as never);
});
app.post("/api/admin/questions/import/confirm", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "confirm" });
  return adapt(adminQuestionsImportWorkflow)(req as never, res as never);
});
app.get("/api/admin/questions/import/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "batch", id: req.params.id });
  return adapt(adminQuestionsImportWorkflow)(req as never, res as never);
});
app.post("/api/admin/questions/import/:id/undo", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { action: "undo", id: req.params.id });
  return adapt(adminQuestionsImportWorkflow)(req as never, res as never);
});
app.get("/api/admin/questions/export", adapt(adminQuestionsExport));
app.get("/api/admin/questions/media-assets", adapt(adminQuestionMediaAssets));
app.post("/api/admin/questions/media-assets", adapt(adminQuestionMediaAssets));
app.delete("/api/admin/questions/media-assets/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(adminQuestionMediaAssets)(req as never, res as never);
});
app.get("/api/admin/questions/:id", adapt(adminQuestionsDetail));
app.put("/api/admin/questions/:id", adapt(adminQuestionsDetail));
app.delete("/api/admin/questions/:id", adapt(adminQuestionsDetail));
app.post("/api/admin/questions/:id/workflow", adapt(adminQuestionsWorkflow));
app.get("/api/admin/questions/:id/versions", adapt(adminQuestionsWorkflow));

// Admin question sets
const adminQuestionSets = lazy(() => import("./functions/admin/question-sets.js"));
app.get("/api/admin/question-sets", adapt(adminQuestionSets));
app.post("/api/admin/question-sets", adapt(adminQuestionSets));
app.get("/api/admin/question-sets/:id", adapt(adminQuestionSets));
app.put("/api/admin/question-sets/:id", adapt(adminQuestionSets));
app.delete("/api/admin/question-sets/:id", adapt(adminQuestionSets));

// Admin users
const adminUsersIndex = lazy(() => import("./functions/admin/users/index.js"));
const adminUsersDetail = lazy(() => import("./functions/admin/users/detail.js"));
const adminUsersActions = lazy(() => import("./functions/admin/users/actions.js"));
const adminUsersExport = lazy(() => import("./functions/admin/users/export.js"));

app.get("/api/admin/users", adapt(adminUsersIndex));
app.post("/api/admin/users", adapt(adminUsersIndex));
app.get("/api/admin/users/export", adapt(adminUsersExport));
app.get("/api/admin/users/:id", adapt(adminUsersDetail));
app.put("/api/admin/users/:id", adapt(adminUsersDetail));
app.post("/api/admin/users/:id/actions", adapt(adminUsersActions));
app.post("/api/admin/users/:id/upgrade", adapt(adminUserSubscription));
app.post("/api/admin/users/:id/downgrade", adapt(adminUserSubscription));
app.post("/api/admin/users/:id/extend", adapt(adminUserSubscription));

// Admin gamification
const adminGamification = lazy(() => import("./functions/admin/gamification.js"));
app.get("/api/admin/gamification", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { resource: "overview" });
  return adapt(adminGamification)(req as never, res as never);
});
app.post("/api/admin/gamification/grant-xp", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { resource: "grant-xp" });
  return adapt(adminGamification)(req as never, res as never);
});
app.get("/api/admin/gamification/achievements", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { resource: "achievements" });
  return adapt(adminGamification)(req as never, res as never);
});
app.post("/api/admin/gamification/achievements", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { resource: "achievements" });
  return adapt(adminGamification)(req as never, res as never);
});
app.delete("/api/admin/gamification/achievements/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    resource: "achievements",
    id: req.params.id,
  });
  return adapt(adminGamification)(req as never, res as never);
});
app.get("/api/admin/gamification/challenges", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { resource: "challenges" });
  return adapt(adminGamification)(req as never, res as never);
});
app.post("/api/admin/gamification/challenges", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { resource: "challenges" });
  return adapt(adminGamification)(req as never, res as never);
});

// Support
const supportTickets = lazy(() => import("./functions/support/tickets.js"));
const supportGuest = lazy(() => import("./functions/support/guest.js"));
const adminSupportTickets = lazy(() => import("./functions/admin/support/tickets.js"));
const adminSupportDisputes = lazy(() => import("./functions/admin/support/disputes.js"));
const adminSupportMerge = lazy(() => import("./functions/admin/support/merge-accounts.js"));

app.get("/api/support/tickets", adapt(supportTickets));
app.post("/api/support/tickets", adapt(supportTickets));
app.get("/api/support/captcha", adapt(supportGuest));
app.get("/api/support/tickets/guest", adapt(supportGuest));
app.get("/api/support/tickets/:ticketNumber", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { ticketNumber: req.params.ticketNumber });
  return adapt(supportTickets)(req as never, res as never);
});
app.post("/api/support/tickets/:ticketNumber/messages", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    ticketNumber: req.params.ticketNumber,
    messages: "1",
  });
  return adapt(supportTickets)(req as never, res as never);
});

app.get("/api/admin/support/dashboard", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { view: "dashboard" });
  return adapt(adminSupportTickets)(req as never, res as never);
});
app.get("/api/admin/support/tickets", adapt(adminSupportTickets));
app.get("/api/admin/support/tickets/:n", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { ticketNumber: req.params.n });
  return adapt(adminSupportTickets)(req as never, res as never);
});
app.post("/api/admin/support/tickets/:n/messages", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    ticketNumber: req.params.n,
    action: "message",
  });
  return adapt(adminSupportTickets)(req as never, res as never);
});
app.put("/api/admin/support/tickets/:n/status", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    ticketNumber: req.params.n,
    action: "status",
  });
  return adapt(adminSupportTickets)(req as never, res as never);
});
app.post("/api/admin/support/tickets/:n/verify-identity", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    ticketNumber: req.params.n,
    action: "verify",
  });
  return adapt(adminSupportTickets)(req as never, res as never);
});
app.get("/api/admin/support/identity-disputes", adapt(adminSupportDisputes));
app.post("/api/admin/support/identity-disputes", adapt(adminSupportDisputes));
app.get("/api/admin/support/identity-disputes/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(adminSupportDisputes)(req as never, res as never);
});
app.put("/api/admin/support/identity-disputes/:id", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  return adapt(adminSupportDisputes)(req as never, res as never);
});
app.post("/api/admin/support/merge-accounts", adapt(adminSupportMerge));

// Monitoring
const monitoringHealth = lazy(() => import("./functions/monitoring/health.js"));
const monitoringClientErrors = lazy(() => import("./functions/monitoring/client-errors.js"));
const maintenanceStatus = lazy(() => import("./functions/maintenance/status.js"));
const maintenanceNotifyMe = lazy(() => import("./functions/maintenance/notify-me.js"));
const syncAnswers = lazy(() => import("./functions/sync/answers.js"));
const syncSessionStatus = lazy(() => import("./functions/sync/session-status.js"));
const syncRecoverSession = lazy(() => import("./functions/sync/recover-session.js"));
const syncCompleteOfflineSession = lazy(() => import("./functions/sync/complete-offline-session.js"));
const adminMaintenance = lazy(() => import("./functions/admin/maintenance/index.js"));
const adminMonitoring = lazy(() => import("./functions/admin/monitoring/index.js"));

app.get("/api/health", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { mode: "basic" });
  return adapt(monitoringHealth)(req as never, res as never);
});
app.get("/api/health/detailed", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { mode: "detailed" });
  return adapt(monitoringHealth)(req as never, res as never);
});
app.get("/api/health/public", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { mode: "public" });
  return adapt(monitoringHealth)(req as never, res as never);
});
app.post("/api/monitoring/client-errors", adapt(monitoringClientErrors));
app.get("/api/maintenance/status", adapt(maintenanceStatus));
app.post("/api/maintenance/notify-me", adapt(maintenanceNotifyMe));
app.post("/api/sync/answers", adapt(syncAnswers));
app.get("/api/sync/session-snapshot", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { sessionId: req.params.sessionId });
  return adapt(syncSessionStatus)(req as never, res as never);
});
app.post("/api/sync/recover-session", adapt(syncRecoverSession));
app.post("/api/sync/complete-offline-session", adapt(syncCompleteOfflineSession));

function adminMaintenanceWith(resource: string, extra: Record<string, string> = {}) {
  return (req: Request, res: Response) => {
    Object.assign(req.query as Record<string, unknown>, { resource, ...extra });
    if (req.params?.id) {
      (req.query as Record<string, unknown>).id = req.params.id;
    }
    return adapt(adminMaintenance)(req as never, res as never);
  };
}

function adminMonitoringWith(resource: string, extra: Record<string, string> = {}) {
  return (req: Request, res: Response) => {
    Object.assign(req.query as Record<string, unknown>, { resource, ...extra });
    if (req.params?.id) {
      (req.query as Record<string, unknown>).id = req.params.id;
    }
    if (req.params?.checkId) {
      (req.query as Record<string, unknown>).checkId = req.params.checkId;
    }
    return adapt(adminMonitoring)(req as never, res as never);
  };
}

app.get("/api/admin/maintenance/windows", adminMaintenanceWith("windows"));
app.post("/api/admin/maintenance/windows", adminMaintenanceWith("windows"));
app.put("/api/admin/maintenance/windows/:id", adminMaintenanceWith("windows"));
app.post("/api/admin/maintenance/windows/:id/activate", adminMaintenanceWith("activate"));
app.post("/api/admin/maintenance/windows/:id/complete", adminMaintenanceWith("complete"));
app.post("/api/admin/maintenance/windows/:id/cancel", adminMaintenanceWith("cancel"));
app.get("/api/admin/maintenance/status", adminMaintenanceWith("status"));
app.post("/api/admin/maintenance/emergency", adminMaintenanceWith("emergency"));
app.get("/api/admin/maintenance/active-sessions", adminMaintenanceWith("active-sessions"));

app.get("/api/admin/monitoring/dashboard", adminMonitoringWith("dashboard"));
app.get("/api/admin/monitoring/logs", adminMonitoringWith("logs"));
app.get("/api/admin/monitoring/metrics", adminMonitoringWith("metrics"));
app.get("/api/admin/monitoring/alerts", adminMonitoringWith("alerts"));
app.put("/api/admin/monitoring/alerts/:id/acknowledge", adminMonitoringWith("alerts", { action: "acknowledge" }));
app.put("/api/admin/monitoring/alerts/:id/resolve", adminMonitoringWith("alerts", { action: "resolve" }));
app.put("/api/admin/monitoring/alerts/:id/silence", adminMonitoringWith("alerts", { action: "silence" }));
app.post("/api/admin/monitoring/test-alert", adminMonitoringWith("alerts"));
app.get("/api/admin/monitoring/alert-rules", adminMonitoringWith("alert-rules"));
app.post("/api/admin/monitoring/alert-rules", adminMonitoringWith("alert-rules"));
app.put("/api/admin/monitoring/alert-rules/:id", adminMonitoringWith("alert-rules"));
app.post("/api/admin/monitoring/alert-rules/seed-defaults", adminMonitoringWith("alert-rules", { action: "seed-defaults" }));
app.get("/api/admin/monitoring/health-checks", adminMonitoringWith("health-checks"));
app.post("/api/admin/monitoring/health-checks/run-all", adminMonitoringWith("health-checks", { action: "run-all" }));
app.post("/api/admin/monitoring/health-checks/:checkId/run", adminMonitoringWith("health-checks"));
app.put("/api/admin/monitoring/config", adminMonitoringWith("config"));
app.get("/api/admin/monitoring/config", adminMonitoringWith("config"));
app.get("/api/admin/monitoring/reports", adminMonitoringWith("reports"));
app.get("/api/admin/monitoring/reports/evaluate-rules", adminMonitoringWith("reports", { action: "evaluate-rules" }));

// Account & platform status
const account = lazy(() => import("./functions/account.js"));
const accountExport = lazy(() => import("./functions/account/data-export.js"));
const accountDeletion = lazy(() => import("./functions/account/deletion-request.js"));
const status = lazy(() => import("./functions/status.js"));

app.delete("/api/account", adapt(account));
app.post("/api/account", adapt(account));
app.get("/api/status", adapt(status));

app.post("/api/account/data-export", adapt(accountExport));
app.get("/api/account/data-export", adapt(accountExport));
app.get("/api/account/data-export/:requestId", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { requestId: req.params.requestId });
  return adapt(accountExport)(req as never, res as never);
});
app.get("/api/account/data-export/:requestId/download", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    requestId: req.params.requestId,
    download: "1",
  });
  return adapt(accountExport)(req as never, res as never);
});

app.post("/api/account/deletion-request", adapt(accountDeletion));
app.get("/api/account/deletion-request", adapt(accountDeletion));
app.post("/api/account/deletion-request/:id/confirm", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    requestId: req.params.id,
    action: "confirm",
  });
  return adapt(accountDeletion)(req as never, res as never);
});
app.post("/api/account/deletion-request/:id/cancel", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, {
    requestId: req.params.id,
    action: "cancel",
  });
  return adapt(accountDeletion)(req as never, res as never);
});

// SEO
const seoSitemap = lazy(() => import("./functions/seo/sitemap.js"));
const seoRobots = lazy(() => import("./functions/seo/robots.js"));
const seoAdsTxt = lazy(() => import("./functions/seo/ads-txt.js"));
const seoPageMeta = lazy(() => import("./functions/seo/page-meta.js"));
const seoRedirectLookup = lazy(() => import("./functions/seo/redirect-lookup.js"));

app.get("/api/seo/sitemap", adapt(seoSitemap));
app.get("/api/seo/robots", adapt(seoRobots));
app.get("/api/seo/ads-txt", adapt(seoAdsTxt));
app.get("/api/seo/page-meta", adapt(seoPageMeta));
app.get("/api/seo/redirect", adapt(seoRedirectLookup));

app.get("/sitemap.xml", adapt(seoSitemap));
app.get("/robots.txt", adapt(seoRobots));
app.get("/ads.txt", adapt(seoAdsTxt));
app.get("/app-ads.txt", adapt(seoAdsTxt));

// Admin SEO
const adminSeo = lazy(() => import("./functions/admin/seo/index.js"));
const adminSeoPublish = lazy(() => import("./functions/admin/seo/publish.js"));

function adminSeoWith(resource: string, extra: Record<string, string> = {}) {
  return (req: Request, res: Response) => {
    Object.assign(req.query as Record<string, unknown>, { resource, ...extra });
    if (req.params?.id) {
      (req.query as Record<string, unknown>).id = req.params.id;
    }
    return adapt(adminSeo)(req as never, res as never);
  };
}

app.get("/api/admin/seo/overrides", adminSeoWith("overrides"));
app.put("/api/admin/seo/overrides", adminSeoWith("overrides"));
app.delete("/api/admin/seo/overrides", adminSeoWith("overrides"));
app.get("/api/admin/seo/redirects", adminSeoWith("redirects"));
app.post("/api/admin/seo/redirects", adminSeoWith("redirects"));
app.put("/api/admin/seo/redirects/:id", adminSeoWith("redirects"));
app.delete("/api/admin/seo/redirects/:id", adminSeoWith("redirects"));
app.get("/api/admin/sitemap-status", adminSeoWith("sitemap-status"));
app.post("/api/admin/seo/publish", adapt(adminSeoPublish));

// Ads
const adsConfig = lazy(() => import("./functions/ads/config.js"));
const adsVideoImpression = lazy(() => import("./functions/ads/video/impression.js"));

app.get("/api/ads/config", adapt(adsConfig));
app.post("/api/ads/video/impression", adapt(adsVideoImpression));

// Blog
const blogList = lazy(() => import("./functions/blog/list.js"));
const blogDetail = lazy(() => import("./functions/blog/detail.js"));
const adminBlog = lazy(() => import("./functions/admin/blog/index.js"));

app.get("/api/blog", adapt(blogList));
app.get("/api/blog/:slug", (req, res) => {
  Object.assign(req.query as Record<string, unknown>, { slug: req.params.slug });
  return adapt(blogDetail)(req as never, res as never);
});

function adminBlogWithId(req: Request, res: Response) {
  if (req.params?.id) {
    Object.assign(req.query as Record<string, unknown>, { id: req.params.id });
  }
  return adapt(adminBlog)(req as never, res as never);
}

app.get("/api/admin/blog", adapt(adminBlog));
app.post("/api/admin/blog", adapt(adminBlog));
app.get("/api/admin/blog/:id", adminBlogWithId);
app.put("/api/admin/blog/:id", adminBlogWithId);
app.delete("/api/admin/blog/:id", adminBlogWithId);

export const handler = serverless(app);
