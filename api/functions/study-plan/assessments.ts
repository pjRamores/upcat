import { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { awardXp } from "../../src/gamification.js";

import {
  computeSchedule,
  type DbStudyPlan,
  findModule,
  recalculatePlanProgress,
  sanitizeQuestionForClient,
  selectAssessmentQuestions,
  toApiStudyPlan,
} from "../../src/studyPlan.js";

interface DbStudyPlanAssessment {
  _id: ObjectId;
  userId: ObjectId;
  studyPlanId: ObjectId;
  moduleId: string;
  assessmentId: string;
  attemptNumber: number;
  config: {
    questionCount: number;
    subtopics: string[];
    difficulty: string;
    passThreshold: number;
    timeLimit: number | null;
  };
  questions: {
    questionId: ObjectId;
    orderIndex: number;
    userAnswer: string | null;
    isCorrect: boolean | null;
    timeSpent: number | null;
    answeredAt: Date | null;
  }[];
  score: {
    total: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    percentage: number;
    passed: boolean;
    bySubtopic: { subtopic: string; correct: number; total: number; percentage: number }[];
  };
  startedAt: Date;
  completedAt: Date | null;
  totalTimeSpent: number | null;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
    nextAction: "proceed" | "retry" | "review_and_retry";
  };
  status: "in_progress" | "completed" | "abandoned";
  createdAt: Date;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();

  const action = typeof req.query.action === "string" ? req.query.action : "";
  const planId = typeof req.query.planId === "string" ? req.query.planId : null;
  const moduleId = typeof req.query.moduleId === "string" ? req.query.moduleId : null;
  const assessmentSessionId = typeof req.query.assessmentSessionId === "string" ? req.query.assessmentSessionId : null;

  try {
    if (req.method === "POST" && planId && moduleId && action === "module-assessment-start") {
      if (!ObjectId.isValid(planId)) {
        return res.status(400).json({ success: false, error: "Invalid plan id" });
      }
      const planDoc = await db.collection<DbStudyPlan>("study_plans").findOne({
        _id: new ObjectId(planId),
        userId: user._id,
      });
      if (!planDoc) {
        return res.status(404).json({ success: false, error: "Study plan not found" });
      }
      const plan = toApiStudyPlan(planDoc);
      const found = findModule(plan, moduleId);
      if (!found) {
        return res.status(404).json({ success: false, error: "Module not found" });
      }

      const prereqIncomplete = found.module.sessions.some(
        (session) => session.status !== "completed" && session.status !== "skipped",
      );
      if (prereqIncomplete) {
        return res.status(400).json({ success: false, error: "Complete or skip all sessions first" });
      }

      const attemptsTaken = found.module.assessment.attempts.length;
      if (attemptsTaken >= found.module.assessment.maxAttempts) {
        return res.status(400).json({ success: false, error: "No attempts remaining" });
      }

      const usedQuestionIds = found.module.sessions
        .flatMap((session) => session.activities)
        .flatMap((activity) => activity.result?.practiceSessionId ? [activity.result.practiceSessionId] : []);

      const questions = await selectAssessmentQuestions(db, found.module, usedQuestionIds);
const doc: Omit<DbStudyPlanAssessment, "_id"> = {
    userId: user._id,
    studyPlanId: new ObjectId(planId),
    moduleId,
    assessmentId: found.module.assessment.id,
    attemptNumber: attemptsTaken + 1,
    config: {
        questionCount: found.module.assessment.questionCount,
        subtopics: found.module.assessment.subtopics,
        difficulty: found.module.assessment.difficulty,
        passThreshold: found.module.assessment.passThreshold,
        timeLimit: null,
    },
    questions: questions.map((q, index) => ({
        questionId: q._id as ObjectId,
        orderIndex: index,
        userAnswer: null,
        isCorrect: null,
        timeSpent: null,
        answeredAt: null,
    })),
    score: {
        total: questions.length,
        correct: 0,
        incorrect: 0,
        unanswered: questions.length,
        percentage: 0,
        passed: false,
        bySubtopic: [],
    },
    startedAt: new Date(),
    completedAt: null,
    totalTimeSpent: null,
    feedback: {
        strengths: [],
        weaknesses: [],
        recommendation: "",
        nextAction: "retry",
    },
    status: "in_progress",
    createdAt: new Date(),
};

const insert = await db.collection<DbStudyPlanAssessment>("study_plan_assessments").insertOne(doc as DbStudyPlanAssessment);
return res.status(200).json({
    success: true,
    data: {
        assessmentSessionId: insert.insertedId.toString(),
        questionCount: doc.config.questionCount,
        timeLimit: doc.config.timeLimit,
        passThreshold: doc.config.passThreshold,
        attemptNumber: doc.attemptNumber,
    },
});

if (req.method === "GET" && assessmentSessionId && action === "assessment-questions") {
    if (!ObjectId.isValid(assessmentSessionId)) {
        return res.status(400).json({success: false, error: "Invalid assessment session id"});
    }
    const assessment = await db
        .collection<DbStudyPlanAssessment>("study_plan_assessments")
        .findOne({_id: new ObjectId(assessmentSessionId), userId: user._id});
    if (!assessment) {
        return res.status(404).json({success: false, error: "Assessment session not found"});
    }

    const questionDocs = await db
        .collection("questions")
        .find({_id: {$in: assessment.questions.map(q => q.questionId)}})
        .toArray();
    const byId = new Map(questionDocs.map((q) => [String(q._id), q]));

    const questions = assessment.questions
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((row) => byId.get(row.questionId.toString()))
        .filter(Boolean)
        .map((q) => sanitizeQuestionForClient(q!));

    return res.status(200).json({success: true, data: {questions}});
}

if (req.method === "POST" && assessmentSessionId && action === "assessment-answer") {
    if (!ObjectId.isValid(assessmentSessionId)) {
        return res.status(400).json({success: false, error: "Invalid assessment session id"});
    }
    const body = (req.body ?? {}) as {questionId?: string; answer?: string; timeSpent?: number;};
    if (!body.questionId || !ObjectId.isValid(body.questionId)) {
        return res.status(400).json({success: false, error: "Invalid questionId"});
    }

    const assessment = await db
        .collection<DbStudyPlanAssessment>("study_plan_assessments")
        .findOne({_id: new ObjectId(assessmentSessionId), userId: user._id});
    if (!assessment) {
        return res.status(404).json({success: false, error: "Assessment session not found"});
    }

    const questionIndex = assessment.questions.findIndex((q) => q.questionId.toString() === body.questionId);
    if (questionIndex === -1) {
        return res.status(404).json({success: false, error: "Question not found in assessment"});
    }
assessment.questions[questionIndex] = {
    ...assessment.questions[questionIndex],
    userAnswer: body.answer ?? null,
    timeSpent: Number(body.timeSpent ?? 0),
    answeredAt: new Date(),
};

await db.collection("study_plan_assessments").updateOne(
    {_id: assessment._id},
    {$set: {questions: assessment.questions}},
);

return res.status(200).json({success: true, data: {saved: true}});
}

if (req.method === "POST" && assessmentSessionId && action === "assessment-submit") {
    if (!ObjectId.isValid(assessmentSessionId)) {
        return res.status(400).json({success: false, error: "Invalid assessment session id"});
    }

    const assessment = await db
        .collection<DbStudyPlanAssessment>("study_plan_assessments")
        .findOne({_id: new ObjectId(assessmentSessionId), userId: user._id});
    if (!assessment) {
        return res.status(404).json({success: false, error: "Assessment session not found"});
    }

    const qdocs = await db
        .collection("questions")
        .find({_id: {$in: assessment.questions.map(q => q.questionId)}})
        .project({_id: 1, correctAnswer: 1, subtopic: 1, rationale: 1})
        .toArray();
    const byId = new Map(qdocs.map((q) => [String(q._id), q]));

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    const bySubtopic = new Map<string, {correct: number; total: number}>();

    assessment.questions = assessment.questions.map(row => {
        const question = byId.get(row.questionId.toString());
        const subtopic = String(question?.subtopic ?? "General");
        if (!bySubtopic.has(subtopic)) bySubtopic.set(subtopic, {correct: 0, total: 0});
        const agg = bySubtopic.get(subtopic)!;
        agg.total += 1;

        let isCorrect: boolean | null = null;
        if (!row.userAnswer) {
            unanswered += 1;
            isCorrect = false;
        } else if (row.userAnswer === String(question?.correctAnswer ?? "")) {
            correct += 1;
            agg.correct += 1;
            isCorrect = true;
        } else {
            incorrect += 1;
            isCorrect = false;
        }

        return {...row, isCorrect};
    });

    const percentage = assessment.questions.length
        ? Math.round((correct / assessment.questions.length) * 100)
        : 0;
    const passed = percentage >= assessment.config.passThreshold;
    const strengths = [...bySubtopic.entries()]
        .filter(({}, v}) => Math.round((v.correct / Math.max(1, v.total)) * 100) >= 75)
        .map(({k}) => k);
    const weaknesses = [...bySubtopic.entries()]
        .filter(({}, v}) => Math.round((v.correct / Math.max(1, v.total)) * 100) < 60)
        .map(({k}) => k);

    assessment.status = "completed";
    assessment.completedAt = new Date();
    assessment.score = {
        total: assessment.questions.length,
        correct,
        incorrect,
        unanswered,
        percentage,
        passed,
        bySubtopic: [...bySubtopic.entries()].map(([subtopic, v]) => ({
            subtopic,
            correct: v.correct,
            total: v.total,
            percentage: Math.round((v.correct / Math.max(1, v.total)) * 100),
        })),
    };
    assessment.feedback = {
        strengths,
        weaknesses,
        recommendation: passed
            ? "Great job! You're ready to move on."
            : `Review ${weaknesses.slice(0, 2).join(", ")}. Before retrying.`,
        nextAction: passed ? "proceed" : weaknesses.length ? "review_and_retry" : "retry",
    };

    await db.collection("study_plan_assessments").updateOne(
        {_id: assessment._id},
        {
            $set: {
                questions: assessment.questions,
score: assessment.score,
feedback: assessment.feedback,
completedAt: assessment.completedAt,
status: assessment.status,
},
});

const planDoc = await db.collection<DbStudyPlan>("study_plans").findOne({ _id: assessment.studyPlanId, userId: user._id });
if (!planDoc) {
    return res.status(404).json({ success: false, error: "Study plan not found" });
}
const plan = toApiStudyPlan(planDoc);
const found = findModule(plan, assessment.moduleId);
if (!found) {
    return res.status(404).json({ success: false, error: "Module not found" });

}

found.module.assessment.attempts.push({
    attemptNumber: assessment.attemptNumber,
    sessionId: assessment._id.toString(),
    score: percentage,
    passed,
    completedAt: assessment.completedAt.toISOString(),
    timeSpent: assessment.totalTimeSpent ?? 0,
});

found.module.assessment.bestScore = Math.max(found.module.assessment.bestScore ?? 0, percentage);
if (passed) {
    found.module.assessment.status = "passed";
    found.module.assessment.passedAt = assessment.completedAt.toISOString();
    found.module.status = "completed";

    const allModules = plan.curriculum.phases.flatMap((phase) => phase.modules);
    const moduleIndex = allModules.findIndex((m) => m.id === found.module.id);
    if (moduleIndex >= 0 && moduleIndex < allModules.length - 1) {
        const next = allModules[moduleIndex + 1];
        if (next.status === "locked") {
            next.status = "active";
            if (next.sessions[0]) next.sessions[0].status = "available";
            next.assessment.status = "available";
        }
    } else {
        found.module.assessment.status =
            found.module.assessment.attempts.length >= found.module.assessment.maxAttempts
                ? "failed"
                : "available";
    }

    plan.progress = recalculatePlanProgress(plan);
    plan.schedule = computeSchedule(plan);

    await db.collection("study_plans").updateOne(
        { _id: assessment.studyPlanId },
        {
            $set: {
                curriculum: plan.curriculum,
                progress: plan.progress,
                schedule: plan.schedule,
                updatedAt: new Date(),
            },
        },
    );

    const xpEarned = passed
        ? 50 + (5 * correct) + (assessment.attemptNumber === 1 ? 25 : 0)
        : 5;
    await awardXp(db, user._id, {
        reason: "admin_grant",
        baseAmount: xpEarned,
        description: passed ? "Passed study plan assessment" : "Completed study plan assessment",
        metadata: {
            category: "study_plan_assessment",
            moduleId: assessment.moduleId,
            score: percentage,
            passed,
        },
    });

    return res.status(200).json({
        success: true,
        data: {
            score: {
                total: assessment.score.total,
                correct: assessment.score.correct,
                percentage: assessment.score.percentage,
                passed,
            },
            bySubtopic: assessment.score.bySubtopic,
            feedback: assessment.feedback,
            attemptsRemaining: Math.max(0, found.module.assessment.maxAttempts - found.module.assessment.attempts.length),
            moduleUnlocked: passed
                ? plan.curriculum.phases.flatMap((phase) => phase.modules).find((m) => m.status === "active")?.id ?? null
                : null,
            xpEarned,
        },
    });
}

if (req.method === "GET" && assessmentSessionId && action === "assessment-review") {
    if (!ObjectId.isValid(assessmentSessionId)) {
        return res.status(400).json({ success: false, error: "Invalid assessment session id" });
}
const assessment = await db.collection<DbStudyPlanAssessment>("study_plan_assessments").findOne({ _id: new ObjectId(assessmentSessionId), userId: user._id, status: "completed"});
if (!assessment) {
    return res.status(404).json({success: false, error: "Completed assessment not found"});
}

const qdocs = await db.collection("questions").find({_id: {$in: assessment.questions.map(q => q.questionId)}}).project({_id: 1, questionText: 1, choices: 1, correctAnswer: 1, rationale: 1, subtopic: 1}).toArray();
const byId = new Map(qdocs.map(q => [String(q._id), q]));

const review = assessment.questions.map(row => {
    const q = byId.get(row.questionId.toString());
    return {
        questionId: row.questionId.toString(),
        questionText: q?.questionText ?? "",
        choices: q?.choices ?? [],
        userAnswer: row.userAnswer,
        isCorrect: row.isCorrect,
        correctAnswer: q?.correctAnswer ?? null,
        rationale: q?.rationale ?? "",
        subtopic: q?.subtopic ?? "General",
    };
});

return res.status(200).json({success: true, data: {review}});

res.setHeader("Allow", "GET, POST");
return res.status(405).json({success: false, error: "Method not allowed"});
} catch (error) {
    console.error("[study-plan/assessments] failed", error);
    return res.status(500).json({success: false, error: "Internal server error"});
}