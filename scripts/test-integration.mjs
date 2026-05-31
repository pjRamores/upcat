#!/usr/bin/env node
/**
 * End-to-end integration test for the UPCAT Simulator API.
 *
 * Usage:
 * node --env-file=api/.env scripts/test-integration.mjs
 * # or manually:
 * API_BASE_URL=http://localhost:3001/api MONGODB_URI=... node scripts/test-integration.mjs
 *
 * Test scenarios covered:
 * Auth -- register, verify, login, /me, /auth/providers, /auth/linked-accounts
 * Exam -- start session, fetch questions (paginated), bulk answer, submit, review
 * Stats -- overview, summary, subject-breakdown, difficulty-breakdown,
 * progress-over-time, weak-area, leaderboard
 * Account -- GET /account (noop), GET /account/data-export, GET /account/deletion-request
 * Misc -- announcements, status health check
 * Cleanup -- removes all seeded rows so every run is idempotent
 *
 * Exits non-zero on any failure so it can gate CI.
 */
import {MongoClient} from "mongodb";
import {randomUUID} from "node:crypto";

const API = (process.env.API_BASE_URL ?? "http://localhost:3001/api").replace(/\/$/, "");
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME =
process.env.MONGODB_DB_NAME ?? process.env.MONGODB_DB ?? "upcat";
const REQUEST_TIMEOUT_MS = Number(process.env.INTEGRATION_TIMEOUT_MS ?? 10_000);

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required so the test can clean up after itself.");
  process.exit(2);
}

const SUFFIX = randomUUID().slice(0, 8);
const TEST_EMAIL = `test_${SUFFIX}@upcat-integration.test`;
const TEST_FIRST = "Integration";
const TEST_LAST = `Tester_${SUFFIX}`;
const TEST_PASSWORD = "Test1234!Secure";

/** @type {Array<{step:string; ok:boolean; detail:string}} */ const results = [];

function log(step, ok, detail = "") {
  results.push({step, ok, detail});
  const tag = ok ? "" : "x";
  console.log(`${tag} ${step}${detail}? ` - ${detail} : ""`);
}

async function call(path, init = {}, token) {
  const url = `${API}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? {Authorization: `Bearer ${token}`}: {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    const fallback = [error?.name, error?.message].filter(Boolean).join(": ") || String(error);
    const msg =
      controller.signal.aborted
      ? `request timed out after ${REQUEST_TIMEOUT_MS}ms`
      : (error?.cause?.message || fallback || "network failure");
    throw new Error(
      `HTTP ${init?.method?? "GET"} ${url} failed: ${msg}. ` +
      `Ensure the API server is running (npm run dev:api) and API_BASE_URL is correct.`,
    );
  } finally {
    clearTimeout(timeout);
  }
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return {status: res.status, body};
}

async function main() {
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(MONGODB_DB_NAME);

  let token = null;
  let sessionId = null;

  try {
    // Fast-fail with a clear message if API is not reachable.
    await call("/status");

    // Auth: public endpoints
  }

  // Health: status (public, no auth)
}
let r = await call("/status");
log("GET /status", r.status === 200 && r.body?.success === true, `status=${r.status}`);

// Public announcements
r = await call("/announcements");
log("GET /announcements", r.status === 200 && r.body?.success === true, `status=${r.status}`);

// Public auth providers list
r = await call("/auth/providers");
log("GET /auth/providers", r.status === 200 && r.body?.success === true, `status=${r.status}`);

// Auth: register

r = await call("/auth/register", {
method: "POST",
body: JSON.stringify({
firstName: TEST_FIRST,
lastName: TEST_LAST,
email: TEST_EMAIL,
password: TEST_PASSWORD,
confirmPassword: TEST_PASSWORD,
}),
});
log("POST /auth/register", r.status === 200 || r.status === 201, `status=${r.status} ${r.body?.error??}"});

// Auth: force-verify email in DB

const upd = await db.collection("users").updateOne({
email: TEST_EMAIL.toLowerCase(),
});
{
$set: {isVerified: true, verifiedAt: new Date()},
$unset: {verificationToken: "", verificationTokenExpiry: ""},
};
log("verify email (db)", upd.matchedCount === 1, `matched=${upd.matchedCount}`);

// Auth: login

r = await call("/auth/login", {
method: "POST",
body: JSON.stringify({email: TEST_EMAIL, password: TEST_PASSWORD}),
});
token = r.body?.data?.token ?? null;
log("POST /auth/login", r.status === 200 && !!token, `status=${r.status}`);
if (!token) throw new Error("no token — cannot continue");

// Auth: /me

r = await call("/auth/me", {}, token);
const me = r.body?.data;
log("GET /auth/me", r.status === 200 && !!me?._id, `userId=${me?._id}`);

// Auth: linked accounts

r = await call("/auth/linked-accounts", {}, token);
log("GET /auth/linked-accounts", r.status === 200 && r.body?.success === true, `status=${r.status}`);

// Auth: invalid login (wrong password)

r = await call("/auth/login", {
method: "POST",
body: JSON.stringify({email: TEST_EMAIL, password: "WrongPassword1!"}),
});
log("POST /auth/login (wrong pw → 401)", r.status === 401, `status=${r.status}`);

// Exam: start

r = await call("/exam/start", {
method: "POST",
body: JSON.stringify({totalQuestions: 10}),
}, token);
sessionId = r.body?.data?.sessionId ?? null;
log(
"POST /exam/start",
(r.status === 200 || r.status === 201) && !!sessionId,
`status=${r.status} session=${sessionId}`,
);
if (!sessionId) throw new Error("no sessionId — cannot continue");

// Exam: sessions list

r = await call("/exam/sessions", {}, token);
log("GET /exam/sessions", r.status === 200 && r.body?.success === true, `status=${r.status}`);

// Exam: fetch all questions (single page, large limit)

r = await call(`/exam/${sessionId}/questions?limit=200`, {}, token);
const questions = r.body?.data?.questions ?? [];
log(
"GET /exam/:id/questions",
r.status === 200 && Array.isArray(questions) && questions.length > 0,
`count=${questions.length}`,
);

// Exam: bulk answer (letter choices A/B/C/D)

const LETTERS = ["A", "B", "C", "D"];
const answers = questions.map((q) => ({
questionId: q._id,
answer: LETTERS[Math.floor(Math.random() * 4)],
timeSpent: Math.floor(Math.random() * 30) + 5,
}));
r = await call(`/exam/${sessionId}/answer-bulk`, {
method: "POST",
body: JSON.stringify({answers}),
}, token);
log("POST /exam/:id/answer-bulk", r.status === 200, `status=${r.status}`);

// — Exam: submit —

r = await call(`/exam/${sessionId}/submit`, {method: "POST"}, token);
const score = r.body?.data?.score;
log(
  "POST /exam/:id/submit",
  r.status === 200 && !!score,
  `pct=${score?.percentage???"%"}`,
);

// — Exam: review (only works after submit) —

r = await call(`/exam/${sessionId}/review`, {}, token);
log("GET /exam/:id/review", r.status === 200 && r.body?.success === true, `status=${r.status}`);

// — Exam: duplicate submit → 200 with alreadyScored flag —

r = await call(`/exam/${sessionId}/submit`, {method: "POST"}, token);
log(
  "POST /exam/:id/submit (already scored)",
  r.status === 200 && r.body?.data?.alreadyScored === true,
  `status=${r.status}`,
);

// — Stats —

for (const ep of [
  "/stats/overview",
  "/stats/summary",
  "/stats/subject-breakdown",
  "/stats/difficulty-breakdown",
  "/stats/progress-over-time",
  "/stats/weak-areas",
  "/stats/leaderboard",
]) {
  r = await call(ep, {}, token);
  log(`GET ${ep}`, r.status === 200 && r.body?.success === true, `status=${r.status}`);
}

// — Account: data-export request —

// POST creates an export; duplicate within 24h returns 409 — both are valid
r = await call("/account/data-export", {
  method: "POST",
  body: JSON.stringify({
    format: "json",
    includeExamHistory: true,
    includeStats: true,
    includePersonalInfo: true
  }),
}, token);
log(
  "POST /account/data-export",
  r.status === 200 || r.status === 201 || r.status === 202 || r.status === 409,
  `status=${r.status}`,
);

// — Account: deletion-request (no password set = social-only check) —

// Expect 400 (scope required) — proves the endpoint is reachable
r = await call("/account/deletion-request", {
  method: "POST",
  body: JSON.stringify({}),
}, token);
log(
  "POST /account/deletion-request (no scope → 400)",
  r.status === 400,
  `status=${r.status}`,
);

// — Auth: accessing protected route without token → 401 —

r = await call("/auth/me");
log("GET /auth/me (no token → 401)", r.status === 401, `status=${r.status}`);

} catch (err) {
  log("UNCAUGHT", false, err?.message ?? String(err));
} finally {
  // — Cleanup: remove everything we created —

  try {
    const user = await db.collection("users").findOne({email: TEST_EMAIL.toLowerCase()});
    if (user?.id) {
      await db.collection("exam_sessions").deleteMany({userId: user._id});
      await db.collection("user_answers").deleteMany({userId: user._id});
      await db.collection("activity_log").deleteMany({actorId: user._id});
      await db.collection("data_requests").deleteMany({userId: user._id});
      await db.collection("users").deleteOne({_id: user._id});
      log("cleanup", true, `removed user ${user._id}`);
    } else {
      log("cleanup", true, "no test user found");
    }
  } catch (cleanupErr) {
    log("cleanup", false, cleanupErr?.message ?? String(cleanupErr));
  }
  await mongo.close();
}

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log(`\n— Summary: ${passed} passed, ${failed} failed —`);
// Use setTimeout to let the event loop drain before exiting (avoids UV_HANDLE_CLOSING·crash)
setTimeout(() => process.exit(false === 0 ? 0 : 1), 100);
main().catch((e) => {
  console.error(e);
  process.exit(1);
});