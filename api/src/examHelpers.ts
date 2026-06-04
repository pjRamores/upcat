import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { extractToken } from "./auth.js";
import {getDb} from "./db.js";
import type {QuestionChoice} from "@upcat/shared";

const ANSWER_LABELS = ["A", "B", "C", "D"] as const;

function isAnswerLabel(value: unknown): value is "A" | "B" | "C" | "D" {
    return typeof value === "string" && ANSWER_LABELS.includes(value as "A" | "B" | "C" | "D");
}

function normalizeChoices(choices: QuestionChoice[]): QuestionChoice[] {
    const byLabel = new Map<`A` | `B` | `C` | `D`, QuestionChoice>();

    for (const choice of choices) {
        if (!choice || !isAnswerLabel(choice.label) || typeof choice.text !== "string") continue;
        if (!byLabel.has(choice.label)) {
            byLabel.set(choice.label, {label: choice.label, text: choice.text});
        }
    }

    const normalized = ANSWER_LABELS.map((label) => byLabel.get(label)).filter(
        (choice): choice is QuestionChoice => Boolean(choice),
    );

    if (normalized.length >= 2) {
        return normalized;
    }

    // Fallback for malformed source data: preserve first 4 textual choices and relabel.
    return choices
        .filter((choice) => choice && typeof choice.text === "string")
        .slice(0, ANSWER_LABELS.length)
        .map((choice, index) => ({
            label: ANSWER_LABELS[index] ?? "A",
            text: choice.text,
        }));
}

export interface AuthedSessionContext {
    userId: ObjectId;
    sessionId: ObjectId;
    db: Awaited<ReturnType<typeof getDb>>;
}

/**
 * Authenticate request and resolve a sessionId from query/body.
 * Returns null after writing an error response.
 */
export async function requireSessionAccess(
    req: VercelRequest,
    res: VercelResponse,
): Promise<AuthedSessionContext | null> {
    const payload = extractToken(req);
    if (!payload) {
        res.status(401).json({success: false, error: "Unauthorized"});
        return null;
    }

    const sessionId =
        (typeof (req as any).params?.sessionId === "string" && (req as any).params.sessionId) ||
        (typeof req.query.sessionId === "string" && req.query.sessionId) ||
        (typeof (req.body as Record<string, unknown> | undefined)?.sessionId === "string"
            ? (req.body as Record<string, unknown>).sessionId as string
            : undefined);

    if (!sessionId || !ObjectId.isValid(sessionId)) {
        res.status(400).json({success: false, error: "Valid sessionId is required"});
        return null;
    }

    const db = await getDb();
    return {
        db,
        userId: new ObjectId(payload.userId),
        sessionId: new ObjectId(sessionId),
    };
}

/** Fisher-Yates shuffle (in-place) */
export function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Randomize the order of choices and remap labels so each session has its own answer key.
 */
export function randomizeChoicesForSession(
    choices: QuestionChoice[],
    originalCorrectAnswer: "A" | "B" | "C" | "D",
): {choices: QuestionChoice[]; correctAnswer: "A" | "B" | "C" | "D"} {
    const normalizedChoices = normalizeChoices(choices);
    if (normalizedChoices.length === 0) {
        return {
            choices: [],
            correctAnswer: isAnswerLabel(originalCorrectAnswer) ? originalCorrectAnswer : "A",
        };
    }
const effectiveOriginalCorrect = normalizedChoices.some(
  (choice) => choice.label === originalCorrectAnswer,
)
? originalCorrectAnswer
: normalizedChoices[0].label;

const randomized = shuffle(
  normalizedChoices.map((choice) => ({
    originalLabel: choice.label,
    text: choice.text,
  })),
);
const labels: Array<"A" | "B" | "C" | "D"> = [...ANSWER_LABELS];

let remappedCorrectAnswer: "A" | "B" | "C" | "D" = effectiveOriginalCorrect;
const remappedChoices = randomized.map((choice, index) => {
  const nextLabel = labels[index] ?? "A";
  if (choice.originalLabel === effectiveOriginalCorrect) {
    remappedCorrectAnswer = nextLabel;
  }
  return {
    label: nextLabel,
    text: choice.text,
  };
});

return {
  choices: remappedChoices,
  correctAnswer: remappedCorrectAnswer,
};