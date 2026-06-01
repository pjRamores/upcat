/**
 * Phase 15b — CAPTCHA generation, persistence, and verification.
 *
 * Supports four challenge types — all self-hosted, no external services:
 * math — "What is 7 + 12?" (easy)
 * image — pick all SVG tiles matching the prompt (medium)
 * puzzle — slide piece to target X-coordinate (hard, time-checked)
 * pow — find a nonce so SHA-256(challenge+nonce) has N-leading
 * hex zeros (invisible to humans, painful to bots at scale)
 *
 * Challenges live in `captcha_challenges` with a per-doc TTL. On success
 * we issue a signed JWT (audience "captcha") that the caller passes back
 * via `X-Captcha-Token`; `verifyCaptchaToken()` enforces it.
 */
import {createHash, randomBytes, randomInt} from "node:crypto";
import jwt from "jsonwebtoken";
import {ObjectId} from "mongodb";
import {
  CAPTCHA_MAX_ATTEMPTS,
  CAPTCHA_TOKEN_TTL_SECONDS,
  CAPTCHA_TTL_SECONDS,
  CAPTCHA_TYPES,
  type: CaptchaChallengePayload,
  type: CaptchaImageOption,
  type: CaptchaType,
  IMAGE_CAPTCHA_GRID_SIZE,
  IMAGE_CAPTCHA_TARGET_MAX,
  IMAGE_CAPTCHA_TARGET_MIN,
  POW_DIFFICULTY_ELEVATED,
  POW_DIFFICULTY_NORMAL,
  PUZZLE_MIN_SOLVE_MS,
  PUZZLE_PIECE_SIZE,
  PUZZLE_TOLERANCE_PX,
  PUZZLE_TRACK_WIDTH,
} from "@upcat/shared";
import {getDb} from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const CAPTCHA_AUDIENCE = "captcha";

interface CaptchaDoc {
  _id: ObjectId;
  type: CaptchaType;
  answer: unknown;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  solved: boolean;
}

// Generation -----------------------------------------------------------------

/**
 * Generates a fresh challenge and persists the answer server-side.
 * Caller may pass `elevated: true` for higher-difficulty PoW.
 */
export async function generateCaptcha(opts: {
  type?: CaptchaType;
  elevated?: boolean;
}): Promise<CaptchaChallengePayload> {
  const type = opts.type && CAPTCHA_TYPES.includes(opts.type)?opts.type: pickAutoType();
  const id = new ObjectId();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + CAPTCHA_TTL_SECONDS * 1000);

  let answer: unknown;
  let challenge: CaptchaChallengePayload["challenge"];

  switch (type) {
    case "math": {
      const a = randomInt(2, 20);
      const b = randomInt(2, 20);
      const op = pickOne(["+", "-", "×"]) as const;
      const value = op === "+" ? a + b : op === "-" ? a - b : a * b;
      answer = value;
      challenge = {question: `What is ${a} ${op} ${b}?`};
      break;
    }
    case "image": {
      const built = buildImageChallenge();
      answer = built.correctIds;
      challenge = {prompt: built.prompt, options: built.options};
      break;
    }
    case "puzzle": {
      // Target x □ [40, trackWidth - pieceSize - 10]
      const targetX = randomInt(40, PUZZLE_TRACK_WIDTH - PUZZLE_PIECE_SIZE - 10);
      const pieceY = randomInt(20, 80);
      answer = {targetX};
      challenge = {
        backgroundSvg: buildPuzzleBackground(targetX, pieceY),
        pieceSvg: buildPuzzlePiece(),
        pieceY,
        trackWidth: PUZZLE_TRACK_WIDTH,
        pieceSize: PUZZLE_PIECE_SIZE,
      };
      break;
    }
    case "pow": {
      const difficulty = opts.elevated ? POW_DIFFICULTY_ELEVATED : POW_DIFFICULTY_NORMAL;
      const challengeStr = randomBytes(16).toString("hex");
      answer = {challenge: challengeStr, difficulty};
      challenge = {challenge: challengeStr, difficulty};
    }
  }
}
break;
}
}

const doc: CaptchaDoc = {
  _id: id,
  type,
  answer,
  createdAt,
  expiresAt,
  attempts: 0,
  solved: false,
};

const db = await getDb();
await db.collection("captcha_challenges").insertOne(doc as never);

return {
  captchaId: id.toHexString(),
  type,
  expiresAt: expiresAt.toISOString(),
  challenge,
};
}

function pickAutoType(): CaptchaType {
  // Default to PoW (no user interaction); a higher-level helper may force a
  // visible type when bot risk is elevated.
  return "pow";
}

function pickOne<T>(list: readonly T[]): T {
  return list[randomInt(0, list.length)]!
}

// Verification

export interface VerifyResult {
  valid: boolean;
  reason?: {
    | "expired"
    | "not_found"
    | "too_many_attempts"
    | "already_solved"
    | "wrong_answer"
    | "too_fast";
    /** Signed JWT when valid (10-min, audience=captcha). */
    token?: string;
    type?: CaptchaType;
  }
}

export async function verifyCaptcha(
  captchaId: string,
  answer: unknown,
  meta: { elapsedMs?: number } = {},
) : Promise<VerifyResult> {
  if (!ObjectId.isValid(captchaId)) return { valid: false, reason: "not_found" };
  const db = await getDb();
  const coll = db.collection("captcha_challenges");
  const doc = (await coll.findOne({_id: new ObjectId(captchaId)})) as CaptchaDoc | null;
  if (!doc) return { valid: false, reason: "not_found" };
  if (doc.solved) return { valid: false, reason: "already_solved" };
  if (doc.expiresAt.getTime() < Date.now()) {
    await coll.deleteOne({_id: doc._id});
    return { valid: false, reason: "expired" };
  }
  if (doc.attempts >= CAPTCHA_MAX_ATTEMPTS) {
    return { valid: false, reason: "too_many_attempts" };
  }

  // Increment attempts first so brute-forcers can't race.
  await coll.updateOne({_id: doc._id}, {$inc: {attempts: 1}});

  const ok = await checkAnswer(doc, answer, meta);
  if (!ok.valid) {
    return { valid: false, reason: ok.reason, type: doc.type};
  }

  await coll.updateOne({_id: doc._id}, {$set: {solved: true}});
  const token = signCaptchaToken({cid: doc._id.toHexString(), type: doc.type});
  return { valid: true, token, type: doc.type};
}

async function checkAnswer(
  doc: CaptchaDoc,
  answer: unknown,
  meta: { elapsedMs?: number },
) : Promise<{ valid: true } | { valid: false } | reason: VerifyResult["reason"] }> {
  switch (doc.type) {
    case "math": {
      const expected = doc.answer as number;
      const got = Number(answer);
      return Number.isFinite(got) && got === expected
        ? { valid: true }
        : { valid: false, reason: "wrong_answer" };
    }
    case "image": {
      const expected = (doc.answer as string[]).slice().sort();
      const got = Array.isArray(answer) ? (answer as string[]).slice().sort() : null;
      if (!got || got.length !== expected.length) {
        return { valid: false, reason: "wrong_answer" };
      }
      return got.every((v, i) => v === expected[i])
    }
  }
}
{valid: false, reason: "wrong_answer"};
}

case "puzzle": {
if (meta.elapsedMs !== undefined && meta.elapsedMs < PUZZLE_MIN_SOLVE_MS) {
return {valid: false, reason: "too_fast"};
}
const expected = (doc.answer as {targetX: number}).targetX;
const got = Number(
typeof answer === "object" && answer !== null && "x" in (answer as Record<string, unknown>))
? (answer as {x: unknown}).x
: answer,
);
if (!Number.isFinite(got)) return {valid: false, reason: "wrong_answer"};
return Math.abs(got - expected) <= PUZZLE_TOLERANCE_PX
? {valid: true}
: {valid: false, reason: "wrong_answer"};
}

case "pow":
default: {
const {challenge, difficulty} = doc.answer as {
challenge: string;
difficulty: number;
};
const nonce = String(answer ?? "");
if (!/^[A-Za-z0-9_]{1,128}$/.test(nonce)) {
return {valid: false, reason: "wrong_answer"};
}
const hash = createHash("sha256").update(challenge + nonce).digest("hex");
const prefix = "0".repeat(difficulty);
return hash.startsWith(prefix)
? {valid: true}
: {valid: false, reason: "wrong_answer"};
}
}

// — Tokens —

interface CaptchaTokenPayload {
cid: string;
type: CaptchaType;
iat?: number;
exp?: number;
aud?: string;
}

export function signCaptchaToken(payload: Pick<CaptchaTokenPayload, "cid" | "type">): string {
return jwt.sign(payload, JWT_SECRET, {
expiresIn: CAPTCHA_TOKEN_TTL_SECONDS,
audience: CAPTCHA_AUDIENCE,
});
}

export function verifyCaptchaToken(token: string | null | undefined): CaptchaTokenPayload | null {
if (!token) return null;
try {
return jwt.verify(token, JWT_SECRET, {audience: CAPTCHA_AUDIENCE}) as CaptchaTokenPayload;
} catch {
return null;
}
}

/**
 * Extracts the `X-Captcha-Token` header and validates it. Returns the
 * decoded payload or null. Handlers that gate on CAPTCHA should call
 * this and respond 428 Precondition Required when null.
 */
export function extractCaptchaToken(headers: Record<string, string | string[] | undefined>): CaptchaTokenPayload | null {
const raw = headers["x-captcha-token"];
const token = Array.isArray(raw) ? raw[0] : raw;
return verifyCaptchaToken(token);
}

// — Image library (deterministic procedurally-generated SVGs) —

const SHAPE_KINDS = ["triangle", "circle", "square", "star", "hexagon"] as const;
type ShapeKind = (typeof SHAPE_KINDS) [number];

function buildImageChallenge(): {
prompt: string;
options: CaptchaImageOption[];
correctIds: string[];
} {
const targetShape = pickOne(SHAPE_KINDS);
const targetCount = randomInt(IMAGE_CAPTCHA_TARGET_MIN, IMAGE_CAPTCHA_TARGET_MAX + 1);

// Choose which grid positions contain the target shape.
const positions = Array.from({length: IMAGE_CAPTCHA_GRID_SIZE}, (_, i) => i);
shuffleInPlace(positions);
const targetPositions = new Set(positions.slice(0, targetCount));

const options: CaptchaImageOption[] = [];
const correctIds: string[] = [];
for (let i = 0; i < IMAGE_CAPTCHA_GRID_SIZE; i++) {
const id = `t${i}`;
let shape: ShapeKind;
if (targetPositions.has(i)) {
shape = targetShape;
correctIds.push(id);
} else {
// Pick any other shape.
let other = ShapeKind;
do {
other = pickOne(SHAPE_KINDS);
} while (other === targetShape);
shape = other;
}
options.push({id, svg: renderShapeSvg(shape)});

return {
prompt: `Select every tile containing a ${targetShape}.`,
options,
correctIds,
};
}

const SHAPE_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9"];

function shuffleInPlace<T>(arr: T[]): void {
for (let i = arr.length - 1; i > 0; i--) {
const j = randomInt(0, i + 1);
[arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
}
}

const SHAPE_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9"];

function renderShapeSvg(shape: ShapeKind): string {
const fill = pickOne(SHAPE_PALETTE);
const stroke = "#1e293b";
const inner = (() => {
switch (shape) {
case "triangle":
return `<polygon points="50,15 90,85 10,85" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
case "circle":
return `<circle cx="50" cy="50" r="35" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
case "square":
return `<rect x="18" y="18" width="64" height="64" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
case "star":
return `<polygon points="50,12 60,40 90,40 65,58 75,86 50,68 25,86 35,58 10,40 40,40" fill="${fill}" stroke="${stroke}" stroke-linejoin="round"/>`;
case "hexagon":
return `<polygon points="50,12 86,32 86,72 50,92 14,72 14,32" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
}}());
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`;
}

function buildPuzzleBackground(targetX: number, pieceY: number): string {
// Procedural pattern + cut-out at (targetX, pieceY).
const w = PUZZLE_TRACK_WIDTH;
const h = 160;
const size = PUZZLE_PIECE_SIZE;
const grad1 = pickOne(SHAPE_PALETTE);
const grad2 = pickOne(SHAPE_PALETTE);
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${grad1}"/>
<stop offset="100%" stop-color="${grad2}"/>
</linearGradient>
<pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse">
<circle cx="16" cy="16" r="3" fill="rgba(255,255,255,0.25)"/>
</pattern>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect width="${w}" height="${h}" fill="url(#p)"/>
<rect x="${targetX}" y="${pieceY}" width="${size}" height="${size}" rx="8"
fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.65)" stroke-width="2"/>
</svg>`;
}

function buildPuzzlePiece(): string {
const size = PUZZLE_PIECE_SIZE;
const grad1 = pickOne(SHAPE_PALETTE);
const grad2 = pickOne(SHAPE_PALETTE);
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
<defs>
<linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${grad1}"/>
<stop offset="100%" stop-color="${grad2}"/>
</linearGradient>
</defs>
<rect width="${size}" height="${size}" rx="8" fill="url(#pg)"
stroke="white" stroke-width="2"/>
</svg>`;
}