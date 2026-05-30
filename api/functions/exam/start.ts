import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {getDb} from "../../src/db.js";
import {extractToken} from "../../src/auth.js";
import {randomizeChoicesForSession, shuffle} from "../../src/examHelpers.js";
import {
  DIFFICULTIES,
  type QuestionChoice,
  type SessionConfig,
  type SessionQuestionEntry,
  SUBJECT_AREAS,
  type SubjectArea,
} from "@upcat/shared";
import {pickQuestionSetForUser, type QuestionSetConfigDoc, registerQuestionSetAssignment,} from "../../src/examSets.js";
import {LimitReachedError, PaywallError, requireFeature, trackFeatureUsage,} from "../../src/subscription.js";

type ExamDifficulty = "easy" | "medium" | "hard" | "very_hard";
const EXAM_DIFFICULTIES: readonly ExamDifficulty[] = Array.from(
  new Set<ExamDifficulty>([...(DIFFICULTIES as readonly ExamDifficulty[]), "very_hard"]),
);

type QuestionSamplingDoc = {
  _id: ObjectId;
  subjectArea: SubjectArea;
  passageId?: ObjectId | null;
  createdAt?: Date;
  choices?: QuestionChoice[];
  correctAnswer?: "A" | "B" | "C" | "D";
};

function normalizeExamConfigFromSet(setConfig: QuestionSetConfigDoc) {
  const distribution: Record<SubjectArea, number> = {} as Record<SubjectArea, number>;
  let totalQuestions = 0;
  let totalTimeLimit = 0;

  for (const subject of SUBJECT_AREAS) {
    const cfg = setConfig.distribution?.[subject] ?? {questions: 0, timeLimit: 0};
    const questions = Number(cfg.questions ?? 0);
    const timeLimitForSubject = Number(cfg.timeLimit ?? 0);

    distribution[subject] = Math.max(0, Number.isFinite(questions) ? Math.floor(questions) : 0);
    totalQuestions += distribution[subject];
    totalTimeLimit += Math.max(0, Number.isFinite(timeLimitForSubject) ? Math.floor(timeLimitForSubject) : 0);
  }

  return {distribution, totalQuestions, totalTimeLimit};
}

function compareQuestionOrder(a: QuestionSamplingDoc, b: QuestionSamplingDoc): number {
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aTime !== bTime) return aTime - bTime;
  return a._id.toString().localeCompare(b._id.toString());
}

function buildOrderedQuestionMeta(allQuestions: QuestionSamplingDoc[]): {_id: ObjectId; subjectArea: SubjectArea}[] {
  const subjectBuckets = new Map<SubjectArea, QuestionSamplingDoc[]>();
  for (const q of allQuestions) {
    const bucket = subjectBuckets.get(q.subjectArea) ?? [];
    bucket.push(q);
    subjectBuckets.set(q.subjectArea, bucket);
  }

  const ordered: {_id: ObjectId; subjectArea: SubjectArea}[] = [];
  const orderedSubjects: SubjectArea[] = [...SUBJECT_AREAS];
  for (const subject of subjectBuckets.keys()) {
    if (!orderedSubjects.includes(subject)) {
      orderedSubjects.push(subject);
    }
  }

  for (const subject of orderedSubjects) {
    const subjectQuestions = subjectBuckets.get(subject) ?? [];
    if (subjectQuestions.length === 0) continue;

    const passageBuckets = new Map<string, QuestionSamplingDoc[]>();
    const standaloneQuestions: QuestionSamplingDoc[] = [];

    for (const q of subjectQuestions) {
      const passageKey = q.passageId ? q.passageId.toString() : null;
      if (!passageKey) {
        standaloneQuestions.push(q);
        continue;
      }
      const group = passageBuckets.get(passageKey) ?? [];
      group.push(q);
      passageBuckets.set(passageKey, group);
    }

    const units: QuestionSamplingDoc[][] = [];
    for (const group of passageBuckets.values()) {
      group.sort(compareQuestionOrder);
      units.push(group);
    }

    for (const q of standaloneQuestions) {
      units.push([q]);
    }

    shuffle(units);
    for (const unit of units) {
      for (const q of unit) {
        ordered.push({_id: q._id, subjectArea: q.subjectArea});
}
return ordered;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
if (req.method !== "POST") {
res.setHeader("Allow", "POST");
return res.status(405).json({success: false, error: "Method not allowed"});
}

const payload = extractToken(req);
if (!payload) {
return res.status(401).json({success: false, error: "Unauthorized"});
}

const db = await getDb();
const userOid = new ObjectId(payload.userId);

const questionSet = await pickQuestionSetForUser(db, userOid);
const {distribution, totalQuestions, totalTimeLimit} = normalizeExamConfigFromSet(questionSet);

if (totalQuestions <= 0 || totalTimeLimit <= 0) {
return res.status(400).json({
success: false,
error: `Question set '${questionSet.setId}' has invalid configuration.`,
});
}

const difficultyMix: Record<ExamDifficulty, number> = {
easy: Number(questionSet.difficultyMix.easy ?? 0),
medium: Number(questionSet.difficultyMix.medium ?? 0),
hard: Number(questionSet.difficultyMix.hard ?? 0),
very_hard: Number(questionSet.difficultyMix.very_hard ?? 0),
};

const config: SessionConfig & {setId: string} = {
setId: questionSet.setId,
totalQuestions,
distribution,
difficultyMix,
timeLimit: totalTimeLimit,
};

// One active mock exam at a time: require resume of existing in-progress session.
const existingInProgress = await db.collection("exam_sessions").findOne({
userId: userOid, status: "in_progress",
projection: {_id: 1}},
);

if (existingInProgress?._id) {
return res.status(409).json({
success: false,
error: "You already have an in-progress mock exam. Resume it before starting a new one.",
sessionId: existingInProgress._id.toString(),
});
}

const userExists = await db.collection("users").findOne({_id: userOid}, {projection: {_id: 1}});

if (userExists) {
try {
await requireFeature(db, userOid, "mock_exam_access");
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
error: `You've used ${err.used} of ${err.limit} mock exams ${periodPhrase}. Upgrade to Premium for unlimited access.`,
featureId: err.featureId,
used: err.used,
limit: err.limit,
period: err.period,
upgradeUrl: "/pricing",
});
}
return res.status(403).json({success: false, error: (err as Error).message});
}
}

// Include all published questions from the assigned set.
const sampledQuestionDocs = await db.collection("questions")
.find({
setId: questionSet.setId,
isDeleted: {$ne: true},
publicationStatus: "published",
})
.project<QuestionSamplingDoc>({
  _id: 1,
  subjectArea: 1,
  passageId: 1,
  createdAt: 1,
  choices: 1,
  correctAnswer: 1,
})
.toArray();

const sampledMeta = buildOrderedQuestionMeta(sampledQuestionDocs);

// Keep config aligned with the actual session question count.
config.totalQuestions = sampledMeta.length;

if (sampledMeta.length === 0) {
  return res.status(503).json({
    success: false,
    error: `No eligible questions found for set '${questionSet.setId}'. Assign questions to this set or activate a set with published questions.`,
  });
}

const randomizedById = new Map(
  sampledQuestionDocs
  .map((doc) => {
    const randomized = randomizeChoicesForSession(
      (doc.choices ?? []) as QuestionChoice[],
      (doc.correctAnswer as "A" | "B" | "C" | "D") ?? "A",
    );
    if (randomized.choices.length === 0) return null;
    return [doc._id.toString(), randomized].as const;
  })
).filter((entry): entry is readonly | string, {
  choices: QuestionChoice[],
  correctAnswer: "A" | "B" | "C" | "D"
}) => Boolean(entry));
);

const sessionQuestions: SessionQuestionEntry[] = sampledMeta.map((q, idx) => ({
  questionId: q._id.toString(),
  orderIndex: idx,
  userAnswer: null,
  isCorrect: null,
  answeredAt: null,
  timeSpent: null,
}));

const now = new Date();
const sessionDoc = {
  userId: userOid,
  setId: questionSet.setId,
  status: "in_progress" as const,
  config,
  questions: sampledMeta.map((q, idx) => ({
    ...(randomizedById.get(q._id.toString()) ?? {}),
    questionId: q._id,
    orderIndex: idx,
    userAnswer: null as string | null,
    isCorrect: null as boolean | null,
    answeredAt: null as Date | null,
    timeSpent: null as number | null,
  })),
  score: null,
  timerState: {
    totalPausedMs: 0,
    pausedAt: null as Date | null,
  },
  startedAt: now,
  completedAt: null as Date | null,
  createdAt: now,
});

const result = await db.collection("exam_sessions").insertOne(sessionDoc);
await registerQuestionSetAssignment(db, userOid, questionSet.setId, result.insertedId);
if (userExists) {
  await trackFeatureUsage(db, userOid, "mock_exam_access", "monthly");
}

return res.status(201).json({
  success: true,
  data: {
    sessionId: result.insertedId.toString(),
    setId: questionSet.setId,
    totalQuestions: sessionQuestions.length,
    timeLimit: config.timeLimit,
    startedAt: now.toISOString(),
  },
});
}