/**
 * AWS Lambda entry point.
 *
 * Wraps the existing Vercel-style handlers with serverless-http and routes incoming
 * API Gateway events to the same files that Vercel serves under /api.
 * This lets one codebase target both platforms.
 */
import express, { type Request, type Response } from "express";
import serverless from "serverless-http";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestMonitoringMiddleware } from "./src/monitoring/context.js";
import { maintenanceMiddleware } from "./src/maintenanceMiddleware.js";

type Handler = (
  req: VercelRequest,
  res: VercelResponse,
) => unknown | Promise<unknown>;

function mutableQuery(req: Request): Record<string, unknown> {
  const q = (req.query ?? {}) as Record<string, unknown>;
  req.query = q as never;
  return q;
}

/**
 * Bridge between an Express (req,res) and the Vercel-style handler signature.
 * Merges Express path params (req.params) into req.query so that Vercel-style
 * handlers can read them uniformly via req.query.
 */
function adapt(handler: Handler) {
  return (req: Request, res: Response) => {
    const expressReq = req as Request & { params?: Record<string, string> };

    // Merge path params into query so handlers can read e.g. req.query.id
    if (expressReq.params) {
      Object.assign(mutableQuery(req), expressReq.params);
    }

    return Promise.resolve(
      handler(req as unknown as VercelRequest, res as unknown as VercelResponse),
    ).catch((err) => {
      // Last-resort error funnel - handlers should respond themselves.
      console.error("[lambda] unhandled handler error", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    });
  };
}

/**
 * Lazy handler: accepts a dynamic import() and caches the resolved default export
 * after the first invocation. Modules are only loaded when their route is first hit,
 * keeping process startup near-instant.
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

const registerH = adapt(register);
const loginH = adapt(login);
const meH = adapt(me);
const providersH = adapt(providers);
const verifyEmailH = adapt(verifyEmail);
const forgotPasswordH = adapt(forgotPassword);
const resetPasswordH = adapt(resetPassword);
const linkedAccountsH = adapt(linkedAccounts);
const unlinkAccountH = adapt(unlinkAccount);
const setPasswordH = adapt(setPassword);
const socialStartH = adapt(socialStart);
const socialCallbackH = adapt(socialCallback);
const recoveryCodesH = adapt(recoveryCodes);

app.post("/api/auth/register", registerH);
app.post("/api/auth/login", loginH);
app.get("/api/auth/me", meH);
app.get("/api/auth/providers", providersH);
app.post("/api/auth/verify-email", verifyEmailH);
app.post("/api/auth/forgot-password", forgotPasswordH);
app.post("/api/auth/reset-password", resetPasswordH);
app.get("/api/auth/linked-accounts", linkedAccountsH);
app.post("/api/auth/unlink", unlinkAccountH);
app.post("/api/auth/set-password", setPasswordH);
app.post("/api/auth/social/:provider/start", socialStartH);
app.post("/api/auth/social/:provider/callback", socialCallbackH);

app.post("/api/auth/recovery-codes/generate", (req, res) => {
  Object.assign(mutableQuery(req), { action: "generate" });
  return recoveryCodesH(req, res);
});

app.get("/api/auth/recovery-codes/status", (req, res) => {
  Object.assign(mutableQuery(req), { action: "status" });
  return recoveryCodesH(req, res);
});

app.post("/api/auth/recovery-codes/verify", (req, res) => {
  Object.assign(mutableQuery(req), { action: "verify" });
  return recoveryCodesH(req, res);
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

const examStartH = adapt(examStart);
const examSessionsH = adapt(examSessions);
const examQuestionsH = adapt(examQuestions);
const examAnswerH = adapt(examAnswer);
const examAnswerBulkH = adapt(examAnswerBulk);
const examPauseH = adapt(examPause);
const examSubmitH = adapt(examSubmit);
const examReviewH = adapt(examReview);
const examFlagH = adapt(examFlag);

app.post("/api/exam/start", examStartH);
app.get("/api/exam/sessions", examSessionsH);
app.get("/api/exam/:sessionId/questions", examQuestionsH);
app.post("/api/exam/:sessionId/answer", examAnswerH);
app.post("/api/exam/:sessionId/answer-bulk", examAnswerBulkH);

app.post("/api/exam/:sessionId/pause", (req, res) => {
  Object.assign(mutableQuery(req), { action: "pause" });
  return examPauseH(req, res);
});

app.post("/api/exam/:sessionId/resume", (req, res) => {
  Object.assign(mutableQuery(req), { action: "resume" });
  return examPauseH(req, res);
});

app.post("/api/exam/:sessionId/submit", examSubmitH);
app.get("/api/exam/:sessionId/review", examReviewH);
app.post("/api/exam/questions/:questionId/flag", examFlagH);

// Monitoring / sync example fix
const monitoringHealth = lazy(() => import("./functions/monitoring/health.js"));
const monitoringClientErrors = lazy(() => import("./functions/monitoring/client-errors.js"));
const maintenanceStatus = lazy(() => import("./functions/maintenance/status.js"));
const maintenanceNotifyMe = lazy(() => import("./functions/maintenance/notify-me.js"));
const syncAnswers = lazy(() => import("./functions/sync/answers.js"));
const syncSessionStatus = lazy(() => import("./functions/sync/session-status.js"));
const syncRecoverSession = lazy(() => import("./functions/sync/recover-session.js"));
const syncCompleteOfflineSession = lazy(() => import("./functions/sync/complete-offline-session.js"));

const monitoringHealthH = adapt(monitoringHealth);
const monitoringClientErrorsH = adapt(monitoringClientErrors);
const maintenanceStatusH = adapt(maintenanceStatus);
const maintenanceNotifyMeH = adapt(maintenanceNotifyMe);
const syncAnswersH = adapt(syncAnswers);
const syncSessionStatusH = adapt(syncSessionStatus);
const syncRecoverSessionH = adapt(syncRecoverSession);
const syncCompleteOfflineSessionH = adapt(syncCompleteOfflineSession);

app.get("/api/health", (req, res) => {
  Object.assign(mutableQuery(req), { mode: "basic" });
  return monitoringHealthH(req, res);
});

app.get("/api/health/detailed", (req, res) => {
  Object.assign(mutableQuery(req), { mode: "detailed" });
  return monitoringHealthH(req, res);
});

app.get("/api/health/public", (req, res) => {
  Object.assign(mutableQuery(req), { mode: "public" });
  return monitoringHealthH(req, res);
});

app.post("/api/monitoring/client-errors", monitoringClientErrorsH);
app.get("/api/maintenance/status", maintenanceStatusH);
app.post("/api/maintenance/notify-me", maintenanceNotifyMeH);
app.post("/api/sync/answers", syncAnswersH);

// Fixed: this route has no :sessionId param, so read from query if present.
app.get("/api/sync/session-snapshot", (req, res) => {
  const q = mutableQuery(req);
  if (req.query.sessionId != null) {
    q.sessionId = String(req.query.sessionId);
  }
  return syncSessionStatusH(req, res);
});

app.post("/api/sync/recover-session", syncRecoverSessionH);
app.post("/api/sync/complete-offline-session", syncCompleteOfflineSessionH);

// ... keep the rest of your routes unchanged using the same pattern ...

export const handler = serverless(app);
