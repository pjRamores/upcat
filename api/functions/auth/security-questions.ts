/**
 * Security questions endpoints -- split by ?action=query param.
 *
 * POST /api/auth/security-questions/set ---- auth required
 * GET  /api/auth/security-questions/lookup ---- public (returns the 3 questions)
 * POST /api/auth/security-questions/verify ---- public (returns recovery JWT)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireUser} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {clientIp, rateLimit} from "../../src/oidc/rateLimit.js";
import {
  hashSecurityAnswers,
  signRecoveryToken,
  type StoredSecurityQuestion,
  verifySecurityAnswers,
} from "../../../../src/recovery.js";
import {RECOVERY_TOKEN_TTL_SECONDS, SECURITY_QUESTION_BANK, SECURITY_QUESTIONS_REQUIRED} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.query.action ?? "").toString();
  if (action === "set") return set(req, res);
  if (action === "lookup") return lookup(req, res);
  if (action === "verify") return verify(req, res);
  return res.status(404).json({success: false, error: "Unknown action"});
}

async function set(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const {questions} = (req.body ?? {}) as {
    questions?: {question: string; answer: string}[];
  };
  if (!Array.isArray(questions) || questions.length !== SECURITY_QUESTIONS_REQUIRED) {
    return res.status(400).json({
      success: false,
      error: `Exactly ${SECURITY_QUESTIONS_REQUIRED} questions are required.`,
    });
  }
  for (const q of questions) {
    if (!q || typeof q.question !== "string" || typeof q.answer !== "string") {
      return res
        .status(400)
        .json({success: false, error: "Each entry must include question and answer."});
    }
    if (!SECURITY_QUESTION_BANK.includes(q.question as (typeof SECURITY_QUESTION_BANK)[number])) {
      return res.status(400).json({
        success: false,
        error: "Question must be one of the predefined options.",
      });
    }
    if (q.answer.trim().length < 2) {
      return res
        .status(400)
        .json({success: false, error: "Answers must be at least 2 characters."});
    }
  }
  const seenQs = new Set(questions.map((q) => q.question));
  if (seenQs.size !== questions.length) {
    return res
      .status(400)
      .json({success: false, error: "All three questions must be different."});
  }

  const hashed = await hashSecurityAnswers(questions);
  const db = await getDb();
  await db.collection("users").updateOne(
    {_id: user._id},
    {
      $set: {
        "security.securityQuestions": hashed,
      },
    },
  );
  await logActivity(db, {
    actorId: user._id,
    actorRole: user.role ?? "reviewee",
    action: "auth.security_questions_set",
    targetType: "user",
    targetId: user._id,
  });
  return res.status(200).json({success: true, data: {ok: true}});
}

async function lookup(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const email = ((req.query.email ?? "") as string).toLowerCase().trim();
  if (!email) {
    return res.status(400).json({success: false, error: "email is required."});
  }
  const limit = rateLimit({
    bucket: "sec_q_lookup",
    key: `${clientIp(req)}|${email}`,
    limit: 10,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) {
res.setHeader("Retry-After", String(limit.retryAfterSec));
return res.status(429).json({success: false, error: "Too many lookups."});
}

const db = await getDb();
const user = await db.collection("users").findOne({email});
// Always return a 200 envelope to avoid revealing whether the email exists.
const sec = (user?.security ?? {}) as { securityQuestions?: StoredSecurityQuestion[] };
const questions = (sec.securityQuestions ?? []).map(q => q.question);
return res.status(200).json({success: true, data: {questions}});

async function verify(req: VercelRequest, res: VercelResponse) {
if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
}
const {email, answers} = (req.body ?? {}) as {
    email?: string;
    answers?: {questionIndex: number; answer: string}[];
};
if (!email || !Array.isArray(answers) || answers.length !== SECURITY_QUESTIONS_REQUIRED) {
    return res.status(400).json({success: false, error: "Email and all three answers are required."});
}
const lookup = email.toLowerCase().trim();
const limit = rateLimit({
    bucket: "sec_q_verify",
    key: `${clientIp(req)}|${lookup}`,
    limit: 3,
    windowMs: 60 * 60_000
});
if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    return res.status(429).json({success: false, error: "Too many attempts. Try again later."});
}
const db = await getDb();
const user = await db.collection("users").findOne({email: lookup});
if (!user) {
    return res.status(401).json({success: false, error: "Verification failed."});
}
const stored = (user.security?.securityQuestions ?? []) as StoredSecurityQuestion[];
if (stored.length !== SECURITY_QUESTIONS_REQUIRED) {
    return res.status(400).json({success: false, error: "No security questions on file."});
}
const ok = await verifySecurityAnswers(stored, answers);
if (!ok) {
    await logActivity(db, {
        actorId: user._id,
        actorRole: "system",
        action: "auth.security_questions_failed",
        targetType: "user",
        targetId: user._id
    });
    return res.status(401).json({success: false, error: "Verification failed."});
}
const token = signRecoveryToken({_id: user._id, email: user.email});
await logActivity(db, {
    actorId: user._id,
    actorRole: "system",
    action: "auth.security_questions_verified",
    targetType: "user",
    targetId: user._id
});
return res.status(200).json({
    success: true,
    data: {recoveryToken: token, expiresInSeconds: RECOVERY_TOKEN_TTL_SECONDS}
});
}