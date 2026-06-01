/**
 * POST /api/practice/start
 *
 * Creates a new spaced-repetition practice session. Selects due + (optionally)
 * new cards according to the requested mode, persists a `practice_sessions`
 * doc with pre-SM-2 snapshots, and returns a sanitized question payload
 * (no correctAnswer / rationale).
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {defaultPracticeSessionCard, PRACTICE_LIMITS, selectCardsForSession} from "../../src/practice.js";
import {
  isPremiumActive,
  LimitReachedError,
  normalizeSubscription,
  PaywallError,
  requireFeature,
  trackFeatureUsage,
} from "../../src/subscription.js";
import {getPaymentConfig} from "../../src/paymentConfig.js";
import type {
  PracticeMode,
  PracticeStartPayload,
  PracticeStartResponse,
  QuestionChoice,
  SubjectArea,
} from "@upcat/shared";
import {PRACTICE_MODES} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const body = (req.body ?? {}).as Partial<PracticeStartPayload>;
  const allowedModes = Array.from(new Set<string>([...PRACTICE_MODES, "random"]));
  const modeRaw = typeof body.mode === "string" ? body.mode : undefined;
  if (!modeRaw || !allowedModes.includes(modeRaw)) {
    return res.status(400).json({
      success: false,
      error: `Invalid mode. Expected one of: ${allowedModes.join(", ")}`,
    });
  }
  const mode = modeRaw as PracticeMode;
  if (mode === "subject_focus" && !body.subjectArea) {
    return res
      .status(400)
      .json({success: false, error: "subjectArea is required for subject_focus mode"});
  }

  const baseMaxQuestions = clamp(
    body.maxQuestions ?? PRACTICE_LIMITS.DEFAULT_MAX_QUESTIONS,
    PRACTICE_LIMITS.MIN_QUESTIONS,
    PRACTICE_LIMITS.MAX_QUESTIONS,
  );
  const newCardsLimit = clamp(
    body.newCardsLimit ?? PRACTICE_LIMITS.DEFAULT_NEW_CARDS_LIMIT,
    PRACTICE_LIMITS.MIN_NEW_CARDS,
    PRACTICE_LIMITS.MAX_NEW_CARDS,
  );

  const db = await getDb();

  try {
    await requireFeature(db, user._id, "practice_test_access");
  } catch (err) {
    if (err instanceof PaywallError) {
      return res.status(403).json({
        success: false,
        error: "This feature requires Premium.",
        featureId: err.featureId,
        upgradeUrl: "/pricing",
      });
    }
    if (err instanceof LimitReachedError) {
      const periodPhrase =
        err.period === "daily"
        ? "today"
        : err.period === "weekly"
        ? "this week"
        : err.period === "monthly"
        ? "this month"
        : "in total";
      return res.status(429).json({
        success: false,
        error: `You've used ${err.used} of ${err.limit} practice tests ${periodPhrase}. Upgrade to Premium for unlimited access.`,
        featureId: err.featureId,
        used: err.used,
        limit: err.limit,
        period: err.period,
        upgradeUrl: "/pricing",
      });
    }
    return res.status(403).json({success: false, error: (err as Error).message});
  }

  const paymentConfig = await getPaymentConfig(db);
  const questionLimitFeature = paymentConfig.featureGating.features.find(
    (f) => f.id === "practice_question_count",
  );
);
const sub = normalizeSubscription(user as unknown as Record<string, unknown>);
const tier = isPremiumActive(sub) ? "premium" : "free";
const configuredMax =
questionLimitFeature?.hasLimit && questionLimitFeature.limits
? questionLimitFeature.limits[tier]
: null;
const maxQuestions = configuredMax !== null ? Math.min(baseMaxQuestions, configuredMax) : baseMaxQuestions;

const {dueCards, newCards, weakSubjects} = await selectCardsForSession(db, user._id, {
mode,
subjectArea: body.subjectArea ?? null,
maxQuestions,
newCardsLimit,
});

const allCards = [...dueCards, ...newCards];
if (allCards.length === 0) {
return res.status(200).json({
success: true,
data: {
sessionId: null,
mode,
subjectArea: body.subjectArea ?? null,
cards: [],
dueCount: 0,
newCount: 0,
weakSubjects,
message:
mode === "review"
? "Nothing is due right now. Come back later or try Mixed mode to introduce new cards."
: "No cards available. Complete an exam first to populate your practice deck.",
},
});
}

// Fetch full question docs (with rationale / answer) for grading later,
// but only sanitized fields are returned to the client.
const questionIds = allCards.map((c) => c.questionId as ObjectId);
const questionDocs = await db.collection("questions")
.find({_id: {$in: questionIds}})
.toArray();
const byQuestion = new Map(questionDocs.map((d) => [d._id.toString(), d]));

// Fetch passages used by these questions.
const passageIds = [
...new Set(
questionDocs
.map((d) => d.passageId)
.filter((p): p.is.ObjectId => p instanceof ObjectId),
],
];

const passages = passageIds.length
? await db
.collection("passages")
.find({_id: {$in: passageIds}})
.toArray();
const passageById = new Map(passages.map((p) => [p._id.toString(), p]));

const dueIds = new Set(dueCards.map((c) => c._id.toString()));
const sessionCards = allCards.map((card, i) =>
defaultPracticeSessionCard(card, i, !dueIds.has(card._id.toString())),
);

const startedAt = new Date();
const sessionDoc = {
userId: user._id,
mode,
subjectArea: body.subjectArea ?? null,
config: {maxQuestions, newCardsLimit},
cards: sessionCards,
status: "in_progress" as const,
startedAt,
completedAt: null as Date | null,
durationMs: null as number | null,
totalAnswered: 0,
totalCorrect: 0,
accuracyPct: null as number | null,
};
const ins = await db.collection("practice_sessions").insertOne(sessionDoc);

const responseCards: PracticeStartResponse["cards"] = sessionCards
.map((sc, idx) => {
const card = allCards[idx];
const q = byQuestion.get((card.questionId as ObjectId).toString());
if (!q) return null;
const passage = q.passageId
? passageById.get((q.passageId as ObjectId).toString())
: null;
return {
cardId: sc.cardId.toString(),
questionId: sc.questionId.toString(),
order: sc.order,
status: sc.status,
isNewIntroduction: sc.isNewIntroduction,
question: {
_id: q._id.toString(),
subjectArea: q.subjectArea as SubjectArea,
subtopic: q.subtopic ?? "",
difficulty: q.difficulty,
type: q.type,
questionText: q.questionText,
}
};
script
choices: (q.choices ??[]) as QuestionChoice[],
passage: passage
? {
  _id: (passage._id as ObjectId).toString(),
  title: passage.title,
  content: passage.content,
  subjectArea: passage.subjectArea as SubjectArea,
}
: null,
};
})
.filter((x): x is PracticeStartResponse["cards"][number] => x !== null);

const data: PracticeStartResponse & { weakSubjects: string[] } = {
  sessionId: ins.insertedId.toString(),
  mode,
  subjectArea: body.subjectArea ?? null,
  cards: responseCards,
  dueCount: dueCards.length,
  newCount: newCards.length,
  weakSubjects,
};

await trackFeatureUsage(db, user._id, "practice_test_access", "daily");

return res.status(200).json({success: true, data});
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}