import { type Db, type Document, ObjectId } from "mongodb";
import type { VercelRequest } from "@vercel/node";

import type {
  Difficulty,
  StudyActivity,
  StudyDiagnosticResults,
  StudyLesson,
  StudyLevel,
  StudyModule,
  StudyPlan,
  StudyPlanAdaptation,
  StudyPlanParameters,
  StudyPlanTemplate,
  StudySession,
  SubjectArea,
} from "@upcat/shared";
import { SUBJECT_AREAS } from "@upcat/shared";

const MS_DAY = 24 * 60 * 60 * 1000;

export const STUDY_PLAN_XP = {
  lesson: 15,
  practice: 20,
  sessionBonus: 30,
  assessmentRetryPass: 50,
  assessmentFirstTryPass: 75,
  module: 100,
  phase: 250,
  plan: 500,
};

export interface SubjectNeed {
  subjectArea: SubjectArea;
  level: StudyLevel;
  timeAllocation: number;
  priority: number;
  weakSubtopics: string[];
  strongSubtopics: string[];
}

export interface DbStudyPlan
  extends Omit<
    StudyPlan,
    "_id" | "userId" | "createdAt" | "updatedAt" | "completedAt" | "abandonedAt"
  > {
  _id: ObjectId;
  userId: ObjectId;
  meta?: {
    templateId: string;
    templateName: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  abandonedAt: Date | null;
}

export interface DbDiagnosticTest {
  _id: ObjectId;
  userId: ObjectId;
  status: "in_progress" | "completed";
  sections: {
    subjectArea: SubjectArea;
    questions: {
      questionId: ObjectId;
      difficulty: Difficulty;
      userAnswer: string | null;
      isCorrect: boolean | null;
      timeSpent: number | null;
      subtopic: string;
      tags: string[];
    }[];
    score: number | null;
    assessedLevel: StudyLevel | null;
  }[];
  result: StudyDiagnosticResults | null;
  startedAt: Date;
  completedAt: Date | null;
}

export function getStudyPlanConfig() {
  return {
    maxActive: Number(process.env.STUDY_PLAN_MAX_ACTIVE ?? "1"),
    reminderTime: process.env.STUDY_PLAN_REMINDER_TIME ?? "08:00",
    adaptationInterval: process.env.ADAPTATION_CHECK_INTERVAL ?? "after_assessment",
  };
}

export function normalizeStudyPlanParameters(
  input: Partial<StudyPlanParameters>,
): StudyPlanParameters {
  const startDate = parseDate(input.startDate ?? null) ?? startOfDay(new Date());
  const examDate = parseDate(input.targetExamDate ?? null);

  return {
    targetExamDate: examDate ? examDate.toISOString() : null,
    availableHoursPerDay: clamp(input.availableHoursPerDay ?? 2, 0.5, 8),
    studyDaysPerWeek: normalizeStudyDays(input.studyDaysPerWeek),
    startDate: startDate.toISOString(),
    preferredStudyTime: input.preferredStudyTime ?? "flexible",
    learningStyle: input.learningStyle ?? "mixed",
    difficultyPreference: input.difficultyPreference ?? "balanced",
    prioritySubjects: normalizeSubjects(input.prioritySubjects),
    excludeSubjects: normalizeSubjects(input.excludeSubjects),
    includeBreakDays: Boolean(input.includeBreakDays),
    breakFrequency:
      input.includeBreakDays && input.breakFrequency
        ? Math.max(2, Math.floor(input.breakFrequency))
        : null,
  };
}

export function validateStudyPlanParameters(parameters: StudyPlanParameters): string[] {
  const errors: string[] = [];

  if (parameters.availableHoursPerDay < 0.5 || parameters.availableHoursPerDay > 8) {
    errors.push("availableHoursPerDay must be between 0.5 and 8");
  }

  if (!parameters.studyDaysPerWeek.length) {
    errors.push("Select at least one study day");
  }

  if (parameters.targetExamDate) {
    const target = new Date(parameters.targetExamDate);
    if (target.getTime() <= Date.now()) {
      errors.push("targetExamDate must be in the future");
    }
  }

  return errors;
}

export async function getActivePlan(db: Db, userId: ObjectId): Promise<DbStudyPlan | null> {
  return db
    .collection<DbStudyPlan>("study_plans")
    .findOne({ userId, status: { $in: ["active", "paused"] } });
}

export function calculateStudyDays(parameters: StudyPlanParameters): Date[] {
  const startDate = new Date(parameters.startDate);
  const targetDate = parameters.targetExamDate
    ? new Date(parameters.targetExamDate)
    : new Date(startDate.getTime() + 12 * 7 * MS_DAY);

  const endDate = startOfDay(targetDate);

  const studyDays: Date[] = [];
  let cursor = startOfDay(startDate);
  let learnedDays = 0;

  while (cursor.getTime() <= endDate.getTime()) {
    const jsDay = cursor.getUTCDay();
    const day = jsDay === 0 ? 7 : jsDay;
    const isStudyDay = parameters.studyDaysPerWeek.includes(day);

    if (isStudyDay) {
      learnedDays += 1;
      const shouldBreak =
        parameters.includeBreakDays &&
        parameters.breakFrequency &&
        learnedDays % parameters.breakFrequency === 0;

      if (!shouldBreak) {
        studyDays.push(new Date(cursor));
      }
    }

    cursor = new Date(cursor.getTime() + MS_DAY);
  }

  return studyDays;
}

export function assessSubjectNeeds(
  diagnostic: StudyDiagnosticResults | null,
  parameters: StudyPlanParameters,
): SubjectNeed[] {
  const excluded = new Set(parameters.excludeSubjects ?? []);
  const priority = new Set(parameters.prioritySubjects ?? []);

  const baseNeeds = SUBJECT_AREAS.filter((subject) => !excluded.has(subject)).map((subject) => {
    const found = diagnostic?.bySubject.find((d) => d.subjectArea === subject);
    const score = found ? found.score : 0;
    const inferredLevel: StudyLevel = found
      ? found.level
      : score >= 71
        ? "advanced"
        : score >= 41
          ? "intermediate"
          : "beginner";

    const base = 100 - score;
    const priorityBoost = priority.has(subject) ? 15 : 0;
    const weight = Math.max(5, base + priorityBoost);

    return {
      subjectArea: subject,
      level: inferredLevel,
      rawWeight: weight,
      weakSubtopics: found?.weakSubtopics ?? [],
      strongSubtopics: found?.strongSubtopics ?? [],
    };
  });

  const totalWeight = baseNeeds.reduce((acc, cur) => acc + cur.rawWeight, 0);

  return baseNeeds.map((n) => ({
    subjectArea: n.subjectArea,
    level: n.level,
    timeAllocation: totalWeight > 0 ? n.rawWeight / totalWeight : 1 / baseNeeds.length,
    priority: n.rawWeight,
    weakSubtopics: n.weakSubtopics,
    strongSubtopics: n.strongSubtopics,
  }));
}

export function buildModuleSequence(
  template: StudyPlanTemplate,
  subjectNeeds: SubjectNeed[],
  parameters: StudyPlanParameters,
): StudyModule[] {
  const needsBySubject = new Map(subjectNeeds.map((s) => [s.subjectArea, s]));
  const excluded = new Set(parameters.excludeSubjects ?? []);

  const modules: StudyModule[] = [];
  let order = 1;

  for (const phase of template.structure.phases) {
    for (const mod of phase.modules) {
      if (excluded.has(mod.subjectArea)) continue;

      const need = needsBySubject.get(mod.subjectArea);
      if (!need) continue;

      modules.push({
        id: moduleId(phase.name, mod.name, order),
        name: mod.name,
        subjectArea: mod.subjectArea,
        subtopic: mod.subtopic,
        description: `${mod.name} module aligned to ${phase.name}.`,
        order,
        estimatedHours: mod.estimatedDays * parameters.availableHoursPerDay,
        difficulty: mod.difficulty,
        status: "locked",
        prerequisites: [],
        objectives: mod.objectives,
        sessions: [],
        assessment: {
          id: `assessment_${slug(mod.name)}_${order}`,
          title: `Test Your Knowledge: ${mod.name}`,
          description: `Assessment for ${mod.name}`,
          questionCount: mod.assessmentConfig.questionCount,
          subtopics: [mod.subtopic, ...need.weakSubtopics.slice(0, 2)],
          difficulty: mod.difficulty,
          passThreshold: mod.assessmentConfig.passThreshold,
          maxAttempts: mod.assessmentConfig.maxAttempts,
          isGating: true,
          status: "locked",
          attempts: [],
          bestScore: null,
          passedAt: null,
        },
      });

      order += 1;
    }
  }

  const bySubject = new Map<SubjectArea, StudyModule[]>();
  for (const m of modules) {
    if (!bySubject.has(m.subjectArea)) bySubject.set(m.subjectArea, []);
    bySubject.get(m.subjectArea)?.push(m);
  }

  const rankedSubjects = [...subjectNeeds]
    .sort((a, b) => b.priority - a.priority)
    .map((n) => n.subjectArea);

  const interleaved: StudyModule[] = [];
  let keepGoing = true;

  while (keepGoing) {
    keepGoing = false;
    for (const subject of rankedSubjects) {
      const queue = bySubject.get(subject);
      if (queue && queue.length) {
        const mod = queue.shift();
        if (mod) {
          keepGoing = true;
          interleaved.push(mod);
        }
      }
    }
  }

  interleaved.forEach((m, idx) => {
    m.order = idx + 1;
    if (idx === 0) {
      m.status = "active";
      m.assessment.status = "available";
    } else {
      m.prerequisites = [interleaved[idx - 1].id];
    }
  });

  return interleaved;
}

export function allocateModuleDays(
  modules: StudyModule[],
  studyDays: Date[],
  subjectNeeds: SubjectNeed[],
  template: StudyPlanTemplate,
): Array<StudyModule & { allocatedDays: Date[] }> {
  if (!modules.length || !studyDays.length) return [];

  const needMap = new Map(subjectNeeds.map((n) => [n.subjectArea, n]));

  const weighted = modules.map((module) => {
    const need = needMap.get(module.subjectArea);
    const difficultyWeight =
      module.difficulty === "hard" ? 1.3 : module.difficulty === "medium" ? 1.1 : 1;
    const levelWeight =
      need?.level === "beginner" ? 1.2 : need?.level === "intermediate" ? 1 : 0.85;
    const subjectWeight = need?.timeAllocation ?? 0.25;

    return {
      module,
      raw: Math.max(1, difficultyWeight * levelWeight * (1 + subjectWeight)),
    };
  });

  const sum = weighted.reduce((acc, cur) => acc + cur.raw, 0);
  const minDays = template.adaptationRules.minimumModuleDays;
  const maxDays = template.adaptationRules.maximumModuleDays;

  const allocatedCounts = weighted.map((w) => {
    const exact = Math.max(minDays, Math.round((w.raw / sum) * studyDays.length));
    return Math.min(maxDays, exact);
  });

  let currentTotal = allocatedCounts.reduce((acc, cur) => acc + cur, 0);

  while (currentTotal > studyDays.length) {
    const idx = allocatedCounts.findIndex((d) => d > minDays);
    if (idx === -1) break;
    allocatedCounts[idx] -= 1;
    currentTotal -= 1;
  }

  while (currentTotal < studyDays.length) {
    const idx = allocatedCounts.findIndex((d) => d < maxDays);
    if (idx === -1) break;
    allocatedCounts[idx] += 1;
    currentTotal += 1;
  }

  let dayCursor = 0;
  return modules.map((m, index) => {
    const count = allocatedCounts[index] ?? minDays;
    const allocated = studyDays.slice(dayCursor, dayCursor + count);
    dayCursor += count;
    return { ...m, allocatedDays: allocated };
  });
}

export async function assignLessonsToActivities(
  db: Db,
  modules: Array<StudyModule & { allocatedDays: Date[] }>,
): Promise<Array<StudyModule & { allocatedDays: Date[] }>> {
  const lessons = await db
    .collection("study_lessons")
    .find({ status: "published" })
    .project({ _id: 1, subjectArea: 1, subtopic: 1, title: 1 })
    .toArray();

  return modules.map((module) => {
    const lesson =
      lessons.find(
        (l) =>
          l.subjectArea === module.subjectArea &&
          (module.subtopic.toLowerCase().includes(String(l.subtopic).toLowerCase()) ||
            String(l.subtopic).toLowerCase().includes(module.subtopic.toLowerCase())),
      ) ?? lessons.find((l) => l.subjectArea === module.subjectArea);

    const dayCount = Math.max(2, module.allocatedDays.length);
    const sessions = module.allocatedDays.map((date, idx) =>
      buildSession(module, lesson ? String(lesson._id) : null, date, idx + 1, dayCount),
    );

    return {
      ...module,
      sessions,
      assessment: {
        ...module.assessment,
        subtopics: [module.subtopic],
      },
    };
  });
}

function buildSession(
  module: StudyModule,
  lessonId: string | null,
  date: Date,
  sessionIndex: number,
  totalSessions: number,
): StudySession {
  const isAssessmentDay = sessionIndex === totalSessions;
  const baseId = `session_day_${sessionIndex}_${slug(module.id)}`;

  const activities: StudyActivity[] = [];
  let order = 1;

  if (sessionIndex === 1) {
    activities.push(activityLesson(baseId, order++, lessonId, module));
    activities.push(activityReview(baseId, order++, module, 8));
  } else if (sessionIndex === 2) {
    activities.push(activityReview(baseId, order++, module, 10));
    activities.push(activityPractice(baseId, order++, module, 14, "easy", 60));
  } else if (isAssessmentDay) {
    activities.push(activityReview(baseId, order++, module, 12));
    activities.push(activityAssessment(baseId, order++, module));
  } else {
    activities.push(activityPractice(baseId, order++, module, 18, "medium", 70));
    activities.push(activityFlashcards(baseId, order++, module));
  }

  return {
    id: baseId,
    dayNumber: 0,
    scheduledDate: date.toISOString(),
    title: `Day ${sessionIndex}: ${module.name}`,
    estimatedMinutes: activities.reduce((acc, cur) => acc + cur.estimatedMinutes, 0),
    status: sessionIndex === 1 ? "available" : "locked",
    completedAt: null,
    activities,
  };
}

function activityLesson(
  baseId: string,
  order: number,
  lessonId: string | null,
  module: StudyModule,
): StudyActivity {
  return {
    id: `${baseId}_lesson_${order}`,
    type: "lesson",
    title: `Lesson: ${module.name}`,
    description: `Study core lesson content for ${module.subtopic}`,
    estimatedMinutes: 25,
    order,
    status: "available",
    completedAt: null,
    content: {
      lessonId,
      practiceConfig: null,
      assessmentConfig: null,
      reviewTopics: null,
      flashcardCount: null,
      flashcardSubtopics: null,
    },
    result: null,
  };
}

function activityReview(
  baseId: string,
  order: number,
  module: StudyModule,
  minutes: number,
): StudyActivity {
  return {
    id: `${baseId}_review_${order}`,
    type: "review",
    title: `Review: ${module.subtopic}`,
    description: "Revisit key concepts and formulas before practice.",
    estimatedMinutes: minutes,
    order,
    status: "available",
    completedAt: null,
    content: {
      lessonId: null,
      practiceConfig: null,
      assessmentConfig: null,
      reviewTopics: [module.subtopic],
      flashcardCount: null,
      flashcardSubtopics: null,
    },
    result: null,
  };
}

function activityPractice(
  baseId: string,
  order: number,
  module: StudyModule,
  questionCount: number,
  difficulty: Difficulty,
  passThreshold: number,
): StudyActivity {
  return {
    id: `${baseId}_practice_${order}`,
    type: "practice",
    title: `Practice: ${module.subtopic}`,
    description: `Targeted practice to strengthen ${module.subtopic}.`,
    estimatedMinutes: 20,
    order,
    status: "available",
    completedAt: null,
    content: {
      lessonId: null,
      practiceConfig: {
        questionCount,
        subtopics: [module.subtopic],
        difficulty,
        passThreshold,
      },
      assessmentConfig: null,
      reviewTopics: null,
      flashcardCount: null,
      flashcardSubtopics: null,
    },
    result: {
      score: null,
      passed: null,
      attempts: 0,
      bestScore: null,
      timeSpent: null,
      practiceSessionId: null,
      assessmentSessionId: null,
    },
  };
}

function activityFlashcards(
  baseId: string,
  order: number,
  module: StudyModule,
): StudyActivity {
  return {
    id: `${baseId}_flashcards_${order}`,
    type: "flashcards",
    title: `Flashcards: ${module.subtopic}`,
    description: "Spaced repetition cards for recent concepts.",
    estimatedMinutes: 12,
    order,
    status: "available",
    completedAt: null,
    content: {
      lessonId: null,
      practiceConfig: null,
      assessmentConfig: null,
      reviewTopics: null,
      flashcardCount: 15,
      flashcardSubtopics: [module.subtopic],
    },
    result: null,
  };
}

function activityAssessment(
  baseId: string,
  order: number,
  module: StudyModule,
): StudyActivity {
  return {
    id: `${baseId}_assessment_${order}`,
    type: "assessment",
    title: `Test Your Knowledge: ${module.name}`,
    description: `Module-end assessment for ${module.name}.`,
    estimatedMinutes: 35,
    order,
    status: "available",
    completedAt: null,
    content: {
      lessonId: null,
      practiceConfig: null,
      assessmentConfig: {
        questionCount: module.assessment.questionCount,
        subtopics: [module.subtopic],
        difficulty: module.assessment.difficulty,
        passThreshold: module.assessment.passThreshold,
        maxAttempts: module.assessment.maxAttempts,
        isModuleGate: true,
      },
      reviewTopics: null,
      flashcardCount: null,
      flashcardSubtopics: null,
    },
    result: {
      score: null,
      passed: null,
      attempts: 0,
      bestScore: null,
      timeSpent: null,
      practiceSessionId: null,
      assessmentSessionId: null,
    },
  };
}

export function organizeIntoPhases(
  template: StudyPlanTemplate,
  modules: Array<StudyModule & { allocatedDays: Date[] }>,
  parameters: StudyPlanParameters,
): StudyPlan["curriculum"] {
  const totalHours = modules.reduce(
    (acc, m) => acc + m.allocatedDays.length * parameters.availableHoursPerDay,
    0,
  );

  let dayCursor = 1;
  const phaseModules = [...modules];

  const phases: StudyPlan["curriculum"]["phases"] = template.structure.phases.map(
    (phase, phaseIndex) => {
      const take = phase.modules.length;
      const assigned = phaseModules.splice(0, take);

      const startDay = dayCursor;
      for (const module of assigned) {
        for (const session of module.sessions) {
          session.dayNumber = dayCursor;
          dayCursor += 1;
        }
      }

      const endDay = Math.max(startDay, dayCursor - 1);

      return {
        id: `phase_${phaseIndex + 1}_${slug(phase.name)}`,
        name: `Phase ${phaseIndex + 1}: ${phase.name}`,
        description: phase.description,
        order: phaseIndex + 1,
        startDay,
        endDay,
        status: phaseIndex === 0 ? "active" : "locked",
        modules: assigned,
      };
    },
  );

  return {
    totalDays: Math.max(0, dayCursor - 1),
    totalHours,
    phases,
  };
}

export function createInitialProgress(
  curriculum: StudyPlan["curriculum"],
): StudyPlan["progress"] {
  const modules = curriculum.phases.flatMap((p) => p.modules);
  const currentModule = modules.find((m) => m.status === "active") ?? modules;
  const firstSession = currentModule?.sessions ?? null;

  return {
    currentPhase: 0,
    currentModule: currentModule?.id ?? "",
    currentDay: firstSession?.dayNumber ?? 1,
    currentSession: firstSession?.id ?? null,
    completedDays: 0,
    totalDays: curriculum.totalDays,
    completedModules: 0,
    totalModules: modules.length,
    completedAssessments: 0,
    passedAssessments: 0,
    overallProgress: 0,
    studyStreak: {
      current: 0,
      longest: 0,
      lastStudyDate: "",
    },
    totalTimeSpent: 0,
    averageTimePerDay: 0,
    averageAssessmentScore: 0,
    subjectProgress: SUBJECT_AREAS.map((subjectArea) => ({
      subjectArea,
      modulesCompleted: 0,
      modulesTotal: modules.filter((m) => m.subjectArea === subjectArea).length,
      averageScore: 0,
      currentLevel: "beginner" as StudyLevel,
    })),
  };
}

export function createInitialSchedule(
  parameters: StudyPlanParameters,
  curriculum: StudyPlan["curriculum"],
): StudyPlan["schedule"] {
  const sessions = curriculum.phases.flatMap((p) => p.modules.flatMap((m) => m.sessions));
  const first = sessions;
  const last = sessions[sessions.length - 1];
  const estimated = last?.scheduledDate ?? parameters.startDate;

  return {
    nextSessionDate: first?.scheduledDate ?? null,
    nextSessionId: first?.id ?? null,
    isOnTrack: true,
    daysAhead: 0,
    estimatedCompletionDate: estimated,
    originalCompletionDate: estimated,
  };
}

export function toApiStudyPlan(doc: DbStudyPlan): StudyPlan {
  return {
    ...doc,
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    completedAt: doc.completedAt ? toIso(doc.completedAt) : null,
    abandonedAt: doc.abandonedAt ? toIso(doc.abandonedAt) : null,
  } as StudyPlan;
}

export async function generatePersonalizedStudyPlan(
  db: Db,
  userId: ObjectId,
  parameters: StudyPlanParameters,
  diagnosticResults: StudyDiagnosticResults | null,
  template: StudyPlanTemplate,
): Promise<DbStudyPlan> {
  const studyDays = calculateStudyDays(parameters);
  const subjectNeeds = assessSubjectNeeds(diagnosticResults, parameters);
  const modules = buildModuleSequence(template, subjectNeeds, parameters);
  const allocated = allocateModuleDays(modules, studyDays, subjectNeeds, template);
  const enriched = await assignLessonsToActivities(db, allocated);
  const curriculum = organizeIntoPhases(template, enriched, parameters);

  const now = new Date();
  const progress = createInitialProgress(curriculum);
  const schedule = createInitialSchedule(parameters, curriculum);

  const payload: Omit<DbStudyPlan, "_id"> = {
    userId,
    status: "active",
    parameters,
    diagnostic: {
      source: diagnosticResults ? "diagnostic_test" : "none",
      diagnosticTestId: null,
      assessedAt: diagnosticResults ? now.toISOString() : null,
      results: diagnosticResults,
    },
    curriculum,
    progress,
    adaptations: [],
    schedule,
    meta: {
      templateId: String((template as unknown as { _id?: unknown })._id ?? ""),
      templateName: template.name,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    abandonedAt: null,
  };

  const result = await db
    .collection<DbStudyPlan>("study_plans")
    .insertOne(payload as DbStudyPlan);

  const created = await db
    .collection<DbStudyPlan>("study_plans")
    .findOne({ _id: result.insertedId });

  if (!created) throw new Error("Failed to load created study plan");
  return created;
}

export function getTemplateSummary(template: StudyPlanTemplate) {
  return {
    id: String((template as unknown as { _id?: unknown })._id ?? ""),
    name: template.name,
    description: template.description,
    targetDuration: template.targetDuration,
    targetHoursPerDay: template.targetHoursPerDay,
  };
}

export function determineLevel(score: number): StudyLevel {
  if (score <= 40) return "beginner";
  if (score <= 70) return "intermediate";
  return "advanced";
}

export async function buildHistoricalDiagnostic(
  db: Db,
  userId: ObjectId,
): Promise<StudyDiagnosticResults> {
  const sessions = await db
    .collection("exam_sessions")
    .find({ userId, status: "completed" })
    .project({ score: 1, answers: 1 })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  if (!sessions.length) {
    return {
      overall: 0,
      bySubject: SUBJECT_AREAS.map((subjectArea) => ({
        subjectArea,
        score: 0,
        level: "beginner" as StudyLevel,
        weakSubtopics: [],
        strongSubtopics: [],
      })),
      recommendedPlanDuration: 10,
      recommendedDailyHours: 2,
    };
  }

  const subjectAgg = new Map<SubjectArea, { total: number; count: number }>();
  for (const s of SUBJECT_AREAS) {
    subjectAgg.set(s, { total: 0, count: 0 });
  }

  let overall = 0;

  for (const session of sessions) {
    overall += Number((session as any).score?.percentage ?? 0);
    const bySubject = (session as any).score?.bySubject ?? [];
    for (const row of bySubject) {
      const subject = row.subjectArea as SubjectArea;
      const entry = subjectAgg.get(subject);
      if (entry) {
        entry.total += Number(row.percentage ?? 0);
        entry.count += 1;
      }
    }
  }

  const bySubject = SUBJECT_AREAS.map((subjectArea) => {
    const agg = subjectAgg.get(subjectArea) ?? { total: 0, count: 0 };
    const score = agg.count ? Math.round(agg.total / agg.count) : 0;
    return {
      subjectArea,
      score,
      level: determineLevel(score),
      weakSubtopics: [],
      strongSubtopics: [],
    };
  });

  const avg = Math.round(overall / sessions.length);

  return {
    overall: avg,
    bySubject,
    recommendedPlanDuration: avg >= 75 ? 6 : avg >= 50 ? 8 : 10,
    recommendedDailyHours: avg >= 75 ? 1.5 : avg >= 50 ? 2 : 2.5,
  };
}

export function buildSelfAssessmentDiagnostic(
  rows: { subjectArea: SubjectArea; level: StudyLevel }[],
): StudyDiagnosticResults {
  const map = new Map(rows.map((r) => [r.subjectArea, r.level]));

  const bySubject = SUBJECT_AREAS.map((subjectArea) => {
    const level = map.get(subjectArea) ?? "beginner";
    const score = level === "advanced" ? 85 : level === "intermediate" ? 60 : 30;
    return {
      subjectArea,
      score,
      level,
      weakSubtopics: [],
      strongSubtopics: [],
    };
  });

  const overall = Math.round(
    bySubject.reduce((acc, cur) => acc + cur.score, 0) / bySubject.length,
  );

  return {
    overall,
    bySubject,
    recommendedPlanDuration: overall >= 70 ? 6 : overall >= 50 ? 8 : 10,
    recommendedDailyHours: overall >= 70 ? 1.5 : 2,
  };
}

export async function startDiagnostic(db: Db, userId: ObjectId) {
  const existing = await db
    .collection<DbDiagnosticTest>("diagnostic_tests")
    .findOne({ userId, status: "in_progress" });

  if (existing) return existing;

  const sections: DbDiagnosticTest["sections"] = [];
  for (const subjectArea of SUBJECT_AREAS) {
    const questions = await selectDiagnosticQuestions(db, subjectArea);
    sections.push({
      subjectArea,
      questions,
      score: null,
      assessedLevel: null,
    });
  }

  const now = new Date();
  const doc: Omit<DbDiagnosticTest, "_id"> = {
    userId,
    status: "in_progress",
    sections,
    result: null,
    startedAt: now,
    completedAt: null,
  };

  const ins = await db
    .collection<DbDiagnosticTest>("diagnostic_tests")
    .insertOne(doc as DbDiagnosticTest);

  const created = await db
    .collection<DbDiagnosticTest>("diagnostic_tests")
    .findOne({ _id: ins.insertedId });

  if (!created) throw new Error("Failed to create diagnostic");
  return created;
}

async function selectDiagnosticQuestions(db: Db, subjectArea: SubjectArea) {
  const easy = await db
    .collection("questions")
    .aggregate([
      {
        $match: {
          subjectArea,
          difficulty: "easy",
          isDeleted: { $ne: true },
          publicationStatus: "published",
        },
      },
      { $sample: { size: 3 } },
    ])
    .toArray();

  const medium = await db
    .collection("questions")
    .aggregate([
      {
        $match: {
          subjectArea,
          difficulty: "medium",
          isDeleted: { $ne: true },
          publicationStatus: "published",
        },
      },
      { $sample: { size: 4 } },
    ])
    .toArray();

  const hard = await db
    .collection("questions")
    .aggregate([
      {
        $match: {
          subjectArea,
          difficulty: "hard",
          isDeleted: { $ne: true },
          publicationStatus: "published",
        },
      },
      { $sample: { size: 3 } },
    ])
    .toArray();

  const all = [...easy, ...medium, ...hard];

  if (all.length < 10) {
    const more = await db
      .collection("questions")
      .aggregate([
        {
          $match: {
            subjectArea,
            isDeleted: { $ne: true },
            publicationStatus: "published",
          },
        },
        { $sample: { size: 10 - all.length } },
      ])
      .toArray();

    all.push(...more);
  }

  return all.slice(0, 10).map((q) => ({
    questionId: q._id as ObjectId,
    difficulty: q.difficulty as Difficulty,
    userAnswer: null,
    isCorrect: null,
    timeSpent: null,
    subtopic: String(q.subtopic ?? "General"),
    tags: Array.isArray(q.tags) ? (q.tags as string[]) : [],
  }));
}

export function toApiDiagnostic(diagnostic: DbDiagnosticTest) {
  return {
    ...diagnostic,
    _id: diagnostic._id.toString(),
    userId: diagnostic.userId.toString(),
    startedAt: toIso(diagnostic.startedAt),
    completedAt: diagnostic.completedAt ? toIso(diagnostic.completedAt) : null,
    sections: diagnostic.sections.map((s) => ({
      ...s,
      questions: s.questions.map((q) => ({
        ...q,
        questionId: q.questionId.toString(),
      })),
    })),
  };
}

export function calculateSectionInsights(
  questions: DbDiagnosticTest["sections"][number]["questions"],
): {
  score: number;
  level: StudyLevel;
  weakSubtopics: string[];
  strongSubtopics: string[];
} {
  const answered = questions.filter((q) => q.userAnswer !== null);
  const correct = answered.filter((q) => q.isCorrect).length;
  const score = answered.length ? Math.round((correct / answered.length) * 100) : 0;

  const bySubtopic = new Map<string, { total: number; correct: number }>();
  for (const q of questions) {
    if (!bySubtopic.has(q.subtopic)) {
      bySubtopic.set(q.subtopic, { total: 0, correct: 0 });
    }
    const row = bySubtopic.get(q.subtopic);
    if (!row) continue;
    row.total += 1;
    if (q.isCorrect) row.correct += 1;
  }

  const weakSubtopics: string[] = [];
  const strongSubtopics: string[] = [];
  for (const [subtopic, agg] of bySubtopic.entries()) {
    const pct = Math.round((agg.correct / Math.max(1, agg.total)) * 100);
    if (pct <= 45) weakSubtopics.push(subtopic);
    if (pct >= 80) strongSubtopics.push(subtopic);
  }

  return {
    score,
    level: determineLevel(score),
    weakSubtopics,
    strongSubtopics,
  };
}

export function summaryFromPlan(plan: StudyPlan) {
  const modules = plan.curriculum.phases.flatMap((p) => p.modules);
  return {
    totalDays: plan.curriculum.totalDays,
    totalModules: modules.length,
    estimatedCompletion: plan.schedule.estimatedCompletionDate,
    phases: plan.curriculum.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      startDay: phase.startDay,
      endDay: phase.endDay,
      modules: phase.modules.length,
    })),
  };
}

export function findSession(plan: StudyPlan, sessionId: string) {
  for (const phase of plan.curriculum.phases) {
    for (const module of phase.modules) {
      const session = module.sessions.find((s) => s.id === sessionId);
      if (session) return { phase, module, session };
    }
  }
  return null;
}

export function findModule(plan: StudyPlan, moduleId: string) {
  for (const phase of plan.curriculum.phases) {
    const module = phase.modules.find((m) => m.id === moduleId);
    if (module) return { phase, module };
  }
  return null;
}

export function recalculatePlanProgress(plan: StudyPlan): StudyPlan["progress"] {
  const phases = plan.curriculum.phases;
  const modules = phases.flatMap((p) => p.modules);
  const sessions = modules.flatMap((m) => m.sessions);

  const completedDays = sessions.filter((s) => s.status === "completed").length;
  const completedModules = modules.filter((m) => m.status === "completed").length;

  const assessments = modules.map((m) => m.assessment);
  const completedAssessments = assessments.filter(
    (a) => a.status === "passed" || a.status === "failed",
  ).length;
  const passedAssessments = assessments.filter((a) => a.status === "passed").length;

  const currentPhase = phases.findIndex((p) => p.status === "active");
  const currentModule = modules.find((m) => m.status === "active") ?? modules[modules.length - 1];
  const currentSession =
    currentModule?.sessions.find((s) => s.status === "available") ?? null;

  const avgAssessmentScore = average(
    assessments.flatMap((a) => a.attempts.map((at) => at.score)),
  );

  const subjectProgress = SUBJECT_AREAS.map((subjectArea) => {
    const subjectModules = modules.filter((m) => m.subjectArea === subjectArea);
    const done = subjectModules.filter((m) => m.status === "completed").length;
    const scores = subjectModules.flatMap((m) => m.assessment.attempts.map((a) => a.score));
    const avgScore = average(scores);

    const currentLevel: StudyLevel =
      avgScore >= 75 ? "advanced" : avgScore >= 50 ? "intermediate" : "beginner";

    return {
      subjectArea,
      modulesCompleted: done,
      modulesTotal: subjectModules.length,
      averageScore: avgScore,
      currentLevel,
    };
  });

  const totalTimeSpent = modules
    .flatMap((m) => m.sessions)
    .flatMap((s) => s.activities)
    .reduce((acc, activity) => acc + Number(activity.result?.timeSpent ?? 0), 0);

  return {
    ...plan.progress,
    currentPhase: currentPhase >= 0 ? currentPhase : 0,
    currentModule: currentModule?.id ?? "",
    currentDay: currentSession?.dayNumber ?? plan.progress.currentDay,
    currentSession: currentSession?.id ?? null,
    completedDays,
    totalDays: plan.curriculum.totalDays,
    completedModules,
    totalModules: modules.length,
    completedAssessments,
    passedAssessments,
    overallProgress: Math.round(
      (completedDays / Math.max(1, plan.curriculum.totalDays)) * 100,
    ),
    totalTimeSpent,
    averageTimePerDay: completedDays ? Math.round(totalTimeSpent / completedDays) : 0,
    averageAssessmentScore: avgAssessmentScore,
    subjectProgress,
  };
}

export function computeSchedule(plan: StudyPlan): StudyPlan["schedule"] {
  const sessions = plan.curriculum.phases.flatMap((p) =>
    p.modules.flatMap((m) => m.sessions),
  );

  const next =
    sessions.find((s) => s.status === "available" || s.status === "in_progress") ?? null;

  const completed = sessions.filter((s) => s.status === "completed").length;
  const today = startOfDay(new Date());

  const plannedByNow = sessions.filter(
    (s) => new Date(s.scheduledDate).getTime() <= today.getTime(),
  ).length;

  const daysAhead = completed - plannedByNow;

  return {
    ...plan.schedule,
    nextSessionDate: next?.scheduledDate ?? null,
    nextSessionId: next?.id ?? null,
    isOnTrack: daysAhead >= 0,
    daysAhead,
  };
}

export function applyAdaptation(
  plan: StudyPlan,
  reason: string,
): { plan: StudyPlan; changes: string[] } {
  const changes: string[] = [];

  if (plan.progress.averageAssessmentScore >= 90) {
    const upcoming = plan.curriculum.phases
      .flatMap((p) => p.modules)
      .filter((m) => m.status === "locked")
      .slice(0, 2);

    for (const module of upcoming) {
      if (module.sessions.length > 2) {
        module.sessions.pop();
        changes.push(`Shortened ${module.name} by one day due to strong performance`);
      }
    }
  }

  if (plan.progress.averageAssessmentScore > 0 && plan.progress.averageAssessmentScore < 60) {
    const active = plan.curriculum.phases
      .flatMap((p) => p.modules)
      .find((m) => m.status === "active");

    if (active) {
      const extraDate = new Date(
        active.sessions[active.sessions.length - 1]?.scheduledDate ?? new Date(),
      );
      extraDate.setDate(extraDate.getDate() + 1);
      active.sessions.push(
        buildSession(active, null, extraDate, active.sessions.length + 1, active.sessions.length + 1),
      );
      changes.push(`Added remedial day to ${active.name} after low assessment results`);
    }
  }

  const adaptation: StudyPlanAdaptation = {
    date: new Date().toISOString(),
    type: "pace_adjustment",
    reason,
    details: {
      averageAssessmentScore: plan.progress.averageAssessmentScore,
      daysAhead: plan.schedule.daysAhead,
    },
    appliedAutomatically: true,
  };

  plan.adaptations.push(adaptation);
  plan.progress = recalculatePlanProgress(plan);
  plan.schedule = computeSchedule(plan);

  return { plan, changes };
}

export function pickTodaySession(plan: StudyPlan) {
  const sessions = plan.curriculum.phases.flatMap((p) =>
    p.modules.flatMap((m) => m.sessions),
  );
  const todayIso = startOfDay(new Date()).toISOString().slice(0, 10);

  const todaySession = sessions.find(
    (s) =>
      s.scheduledDate.slice(0, 10) === todayIso &&
      s.status !== "completed" &&
      s.status !== "skipped",
  );

  if (todaySession) return { session: todaySession, isRestDay: false };

  const next = sessions.find(
    (s) => s.status === "available" || s.status === "in_progress" || s.status === "locked",
  );
  if (next) return { session: next, isRestDay: true };

  return { session: null, isRestDay: false };
}

export async function selectAssessmentQuestions(
  db: Db,
  module: StudyModule,
  excludedQuestionIds: string[],
): Promise<Document[]> {
  const match: Record<string, unknown> = {
    subjectArea: module.subjectArea,
    subtopic: { $regex: escapeRegex(module.subtopic), $options: "i" },
    isDeleted: { $ne: true },
    publicationStatus: "published",
  };

  if (excludedQuestionIds.length) {
    match._id = {
      $nin: excludedQuestionIds
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id)),
    };
  }

  const rows = await db
    .collection("questions")
    .aggregate([{ $match: match }, { $sample: { size: module.assessment.questionCount } }])
    .toArray();

  if (rows.length >= module.assessment.questionCount) return rows;

  const topUp = await db
    .collection("questions")
    .aggregate([
      {
        $match: {
          subjectArea: module.subjectArea,
          isDeleted: { $ne: true },
          publicationStatus: "published",
        },
      },
      { $sample: { size: module.assessment.questionCount - rows.length } },
    ])
    .toArray();

  return [...rows, ...topUp];
}

export function sanitizeQuestionForClient(question: Document) {
  return {
    _id: String(question._id),
    subjectArea: question.subjectArea,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    type: question.type,
    questionText: question.questionText,
    choices: question.choices,
    passageId: question.passageId ? String(question.passageId) : null,
    tags: Array.isArray(question.tags) ? question.tags : [],
  };
}

export function extractQuestionId(req: VercelRequest): string | null {
  const direct = typeof req.query.id === "string" ? req.query.id : null;
  if (direct) return direct;
  const sid = typeof req.query.sessionId === "string" ? req.query.sessionId : null;
  return sid;
}

export function normalizeLesson(doc: Document): StudyLesson {
  return {
    _id: String(doc._id),
    subjectArea: doc.subjectArea as SubjectArea,
    subtopic: String(doc.subtopic ?? ""),
    title: String(doc.title ?? ""),
    content: doc.content as StudyLesson["content"],
    keyTakeaways: Array.isArray(doc.keyTakeaways) ? (doc.keyTakeaways as string[]) : [],
    quickReference: Array.isArray(doc.quickReference)
      ? (doc.quickReference as StudyLesson["quickReference"])
      : [],
    difficulty: (doc.difficulty ?? "medium") as Difficulty,
    estimatedReadingMinutes: Number(doc.estimatedReadingMinutes ?? 10),
    prerequisites: Array.isArray(doc.prerequisites)
      ? doc.prerequisites.map((x: unknown) => String(x))
      : [],
    relatedQuestionTags: Array.isArray(doc.relatedQuestionTags)
      ? (doc.relatedQuestionTags as string[])
      : [],
    status: (doc.status ?? "draft") as "draft" | "published",
    createdBy: String(doc.createdBy ?? "system"),
    createdAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeStudyDays(input: number[] | undefined): number[] {
  const source = Array.isArray(input) && input.length ? input : [1, 2, 3, 4, 5];
  const dedupe = [...new Set(source.map((d) => Math.max(1, Math.min(7, Math.floor(d)))))];
  return dedupe.sort((a, b) => a - b);
}

function normalizeSubjects(input: SubjectArea[] | null | undefined): SubjectArea[] | null {
  if (!Array.isArray(input) || !input.length) return null;
  const accepted = new Set(SUBJECT_AREAS);
  const rows = [...new Set(input.filter((s) => accepted.has(s)))];
  return rows.length ? rows : null;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function moduleId(phaseName: string, moduleName: string, order: number): string {
  return `mod_${slug(phaseName)}_${slug(moduleName)}_${order}`;
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+\$/g, "")
    .slice(0, 48);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((acc, cur) => acc + cur, 0) / values.length) * 100) / 100;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^\${}()|[\]\\]/g, "\\\__CODE_25__");
}
