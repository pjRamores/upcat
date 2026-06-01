import type {Difficulty, SubjectArea} from "./types.js";

export type StudyPlanStatus =
  ... | "generating"
  ... | "active"
  ... | "paused"
  ... | "completed"
  ... | "abandoned";

export type StudyPreferredTime = "morning" | "afternoon" | "evening" | "flexible";
export type StudyLearningStyle = "visual" | "reading" | "practice" | "mixed";
export type StudyDifficultyPreference = "gradual" | "balanced" | "aggressive";
export type StudyDiagnosticSource =
  ... | "diagnostic_test"
  ... | "historical_data"
  ... | "self_assessment"
  ... | "none";

export type StudyLevel = "beginner" | "intermediate" | "advanced";

export type StudyActivityType =
  ... | "lesson"
  ... | "review"
  ... | "practice"
  ... | "flashcards"
  ... | "video_placeholder"
  ... | "assessment";

export type StudyLockableStatus = "locked" | "available" | "in_progress" | "completed" | "skipped";

export interface StudyPlanParameters {
  targetExamDate: string | null;
  availableHoursPerDay: number;
  studyDaysPerWeek: number[];
  startDate: string;
  preferredStudyTime: StudyPreferredTime;
  learningStyle: StudyLearningStyle;
  difficultyPreference: StudyDifficultyPreference;
  prioritySubjects: SubjectArea[] | null;
  excludeSubjects: SubjectArea[] | null;
  includeBreakDays: boolean;
  breakFrequency: number | null;
}

export interface StudySubjectDiagnosticResult {
  subjectArea: SubjectArea;
  score: number;
  level: StudyLevel;
  weakSubtopics: string[];
  strongSubtopics: string[];
}

export interface StudyDiagnosticResults {
  overall: number;
  bySubject: StudySubjectDiagnosticResult[];
  recommendedPlanDuration: number;
  recommendedDailyHours: number;
}

export interface StudyPlanDiagnostic {
  source: StudyDiagnosticSource;
  diagnosticTestId: string | null;
  assessedAt: string | null;
  results: StudyDiagnosticResults | null;
}

export interface StudyPracticeConfig {
  questionCount: number;
  subtopics: string[];
  difficulty: Difficulty | "mixed";
  passThreshold: number;
}

export interface StudyAssessmentConfig {
  questionCount: number;
  subtopics: string[];
  difficulty: Difficulty | "mixed";
  passThreshold: number;
  maxAttempts: number;
  isModuleGate: boolean;
}

export interface StudyActivity {
  id: string;
  type: StudyActivityType;
  title: string;
  description: string;
  estimatedMinutes: number;
  order: number;
  status: StudyLockableStatus;
  completedAt: string | null;
  content: {
    lessonId: string | null;
    practiceConfig: StudyPracticeConfig | null;
    assessmentConfig: StudyAssessmentConfig | null;
    reviewTopics: string[] | null;
    flashcardCount: number | null;
    flashcardSubtopics: string[] | null;
  };
  result: {
    score: number | null;
    passed: boolean | null;
    attempts: number;
    bestScore: number | null;
  };
}
timeSpent: number | null;
practiceSessionId: string | null;
assessmentSessionId: string | null;
} | null;
}

export interface StudySession {
  id: string;
  dayNumber: number;
  scheduledDate: string;
  title: string;
  estimatedMinutes: number;
  status: StudyLockableStatus;
  completedAt: string | null;
  activities: StudyActivity[];
}

export interface StudyModuleAssessmentAttempt {
  attemptNumber: number;
  sessionId: string;
  score: number;
  passed: boolean;
  completedAt: string;
  timeSpent: number;
}

export interface StudyModuleAssessment {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  subtopics: string[];
  difficulty: Difficulty | "mixed";
  passThreshold: number;
  maxAttempts: number;
  isGating: boolean;
  status: "locked" | "available" | "passed" | "failed";
  attempts: StudyModuleAssessmentAttempt[];
  bestScore: number | null;
  passedAt: string | null;
}

export interface StudyModule {
  id: string;
  name: string;
  subjectArea: SubjectArea;
  subtopic: string;
  description: string;
  order: number;
  estimatedHours: number;
  difficulty: Difficulty;
  status: "locked" | "active" | "completed" | "skipped";
  prerequisites: string[];
  objectives: string[];
  sessions: StudySession[];
  assessment: StudyModuleAssessment;
}

export interface StudyPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  startDay: number;
  endDay: number;
  status: "locked" | "active" | "completed";
  modules: StudyModule[];
}

export interface StudyPlanCurriculum {
  totalDays: number;
  totalHours: number;
  phases: StudyPhase[];
}

export interface StudyPlanProgress {
  currentPhase: number;
  currentModule: string;
  currentDay: number;
  currentSession: string | null;
  completedDays: number;
  totalDays: number;
  completedModules: number;
  totalModules: number;
  completedAssessments: number;
  passedAssessments: number;
  overallProgress: number;
  studyStreak:
  {
    current: number;
    longest: number;
    lastStudyDate: string;
  };
  totalTimeSpent: number;
  averageTimePerDay: number;
  averageAssessmentScore: number;
  subjectProgress:
  {
    subjectArea: SubjectArea;
    modulesCompleted: number;
    modulesTotal: number;
    averageScore: number;
    currentLevel: StudyLevel;
  }[];
}
export type StudyPlanAdaptationType =
  | "pace_adjustment"
  | "content_addition"
  | "content_removal"
  | "difficulty_change"
  | "schedule_shift"
  | "module_reorder";

export interface StudyPlanAdaptation {
  date: string;
  type: StudyPlanAdaptationType;
  reason: string;
  details: Record<string, unknown>;
  appliedAutomatically: boolean;
}

export interface StudyPlanSchedule {
  nextSessionDate: string | null;
  nextSessionId: string | null;
  isOnTrack: boolean;
  daysAhead: number;
  estimatedCompletionDate: string;
  originalCompletionDate: string;
}

export interface StudyPlan {
  _id: string;
  userId: string;
  status: StudyPlanStatus;
  parameters: StudyPlanParameters;
  diagnostic: StudyPlanDiagnostic;
  curriculum: StudyPlanCurriculum;
  progress: StudyPlanProgress;
  adaptations: StudyPlanAdaptation[];
  schedule: StudyPlanSchedule;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
}

export interface StudyLesson {
  _id: string;
  subjectArea: SubjectArea;
  subtopic: string;
  title: string;
  content: {
    format: "markdown" | "structured";
    body: string | null;
  } | null;
  sections: {
    type:
      | "text"
      | "definition"
      | "formula"
      | "example"
      | "tip"
      | "warning"
      | "summary"
      | "diagram_placeholder";
      title: string | null;
      content: string;
      formula: string | null;
    example: {
      problem: string;
      solution: string;
      explanation: string;
    } | null;
  } | null;
};

keyTakeaways: string[];
quickReference: { label: string; value: string }[];
difficulty: Difficulty;
estimatedReadingMinutes: number;
prerequisites: string[];
relatedQuestionTags: string[];
status: "draft" | "published";
createdBy: string;
createdAt: string;
updatedAt: string;
}

export interface StudyPlanTemplate {
  _id: string;
  name: string;
  description: string;
  targetDuration: number;
  targetHoursPerDay: number;
  status: "draft" | "active" | "archived";
  structure: {
    phases: {
      name: string;
      weekStart: number;
      weekEnd: number;
      description: string;
      modules: {
        subjectArea: SubjectArea;
        subtopic: string;
        name: string;
        difficulty: Difficulty;
        estimatedDays: number;
        prerequisites: string[];
        objectives: string[];
        assessmentConfig: {
          questionCount: number;
passThreshold: number;
maxAttempts: number;
};
}[];
}[];
};
adaptationRules: {
weakAreaExtraTime: number;
strongAreaReduction: number;
failedAssessmentAction: "repeat_module" | "add_remedial" | "slow_pace";
minimumModuleDays: number;
maximumModuleDays: number;
};
createdBy: string;
createdAt: string;
updatedAt: string;
}

export interface StudyPlanAssessment {
_id: string;
userId: string;
studyPlanId: string;
moduleId: string;
assessmentId: string;
attemptNumber: number;
config: {
questionCount: number;
subtopics: string[];
difficulty: Difficulty | "mixed";
passThreshold: number;
timeLimit: number | null;
};
questions: {
questionId: string;
orderIndex: number;
userAnswer: string | null;
isCorrect: boolean | null;
timeSpent: number | null;
answeredAt: string | null;
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
startedAt: string;
completedAt: string | null;
totalTimeSpent: number | null;
feedback: {
strengths: string[];
weaknesses: string[];
recommendation: string;
nextAction: "proceed" | "retry" | "review_and_retry";
};
status: "in_progress" | "completed" | "abandoned";
createdAt: string;
}

export interface DiagnosticTest {
_id: string;
userId: string;
status: "in_progress" | "completed";
sections: {
subjectArea: SubjectArea;
questions: {
questionId: string;
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
startedAt: string;
completedAt: string | null;
}

export const STUDY_PLAN_API_ROUTES = {
DIAGNOSTIC_START: "/study-plan/diagnostic/start",
DIAGNOSTIC_SECTION_QUESTIONS: (diagnosticId: string) =>
 `/study-plan/diagnostic/${diagnosticId}/questions`,
DIAGNOSTIC_SUBMIT_SECTION: (diagnosticId: string) =>
 `/study-plan/diagnostic/${diagnosticId}/submit-section`,
DIAGNOSTIC_COMPLETE: (diagnosticId: string) => `/study-plan/diagnostic/${diagnosticId}/complete`,
DIAGNOSTIC_SKIP: "/study-plan/diagnostic/skip",
TEMPLATES: "/study-plan/templates",
GENERATE: "/study-plan/generate",
ACTIVE: "/study-plan/active",
PLAN: (planId: string) => `/study-plan/${planId}`,
TODAY: (planId: string) => `/study-plan/${planId}/today`,
SESSION: (planId: string, sessionId: string) => `/study-plan/${planId}/session/${sessionId}`,
ACTIVITY_START: (planId: string, sessionId: string, activityId: string) =>
 `/study-plan/${planId}/session/${sessionId}/activity/${activityId}/start`,
ACTIVITY_COMPLETE: (planId: string, sessionId: string, activityId: string) =>
 `/study-plan/${planId}/session/${sessionId}/activity/${activityId}/complete`,
SESSION_SKIP: (planId: string, sessionId: string) => `/study-plan/${planId}/session/${sessionId}/skip`,
MODULE_ASSESSMENT_START: (planId: string, moduleId: string) =>
  `/study-plan/${planId}/module/${moduleId}/assessment/start`,
ASSESSMENT_QUESTIONS: (assessmentSessionId: string) =>
  `/study-plan/assessment/${assessmentSessionId}/questions`,
ASSESSMENT_ANSWER: (assessmentSessionId: string) =>
  `/study-plan/assessment/${assessmentSessionId}/answer`,
ASSESSMENT_SUBMIT: (assessmentSessionId: string) =>
  `/study-plan/assessment/${assessmentSessionId}/submit`,
ASSESSMENT_REVIEW: (assessmentSessionId: string) =>
  `/study-plan/assessment/${assessmentSessionId}/review`,
ADAPT: (planId: string) => `/study-plan/${planId}/adapt`,
RESCHEDULE: (planId: string) => `/study-plan/${planId}/reschedule`,
PAUSE: (planId: string) => `/study-plan/${planId}/pause`,
RESUME: (planId: string) => `/study-plan/${planId}/resume`,
ABANDON: (planId: string) => `/study-plan/${planId}/abandon`,
ANALYTICS: (planId: string) => `/study-plan/${planId}/analytics`,
CALENDAR: "/study-plan/calendar",
ADMIN_TEMPLATES: "/admin/study-plan/templates",
ADMIN_TEMPLATE: (id: string) => `/admin/study-plan/templates/${id}`,
ADMIN_LESSONS: "/admin/study-plan/lessons",
ADMIN_LESSON: (id: string) => `/admin/study-plan/lessons/${id}`,
ADMIN_ANALYTICS: "/admin/study-plan/analytics",
ADMIN_USERS: "/admin/study-plan/users",
} as const;

export const STUDY_DIAGNOSTIC_LEVEL_THRESHOLDS = {
  beginnerMax: 40,
  intermediateMax: 70,
} as const;

export const STUDY_PLAN_DEFAULTS = {
  maxActivePlans: 1,
  reminderTime: "08:00",
  adaptationCheckInterval: "after_assessment",
} as const;