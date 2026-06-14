import apiClient from "@/lib/api";
import {
  STUDY_PLAN_API_ROUTES,
  type StudyPlan,
  type StudyPlanParameters,
  type SubjectArea,
} from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await p;
  return data.data;
}

export const studyPlanApi = {
  getTemplates: () =>
    unwrap<
      Array<{
        id: string;
        name: string;
        description: string;
        targetDuration: number;
        targetHoursPerDay: number;
      }>
    >(apiClient.get(STUDY_PLAN_API_ROUTES.TEMPLATES)),

  startDiagnostic: () =>
    unwrap<{
      diagnosticId: string;
      sections: { subjectArea: SubjectArea; questionCount: number }[];
    }>(apiClient.post(STUDY_PLAN_API_ROUTES.DIAGNOSTIC_START)),

  getDiagnosticQuestions: (diagnosticId: string, section: SubjectArea) =>
    unwrap<{ subjectArea: SubjectArea; questions: unknown[] }>(
      apiClient.get(STUDY_PLAN_API_ROUTES.DIAGNOSTIC_SECTION_QUESTIONS(diagnosticId), {
        params: { section },
      }),
    ),

  submitDiagnosticSection: (
    diagnosticId: string,
    payload: {
      subjectArea: SubjectArea;
      answers: { questionId: string; answer: string; timeSpent?: number }[];
    },
  ) =>
    unwrap<{ sectionCompleted: boolean; sectionsRemaining: number }>(
      apiClient.post(STUDY_PLAN_API_ROUTES.DIAGNOSTIC_SUBMIT_SECTION(diagnosticId), payload),
    ),

  completeDiagnostic: (diagnosticId: string) =>
    unwrap<{ result: unknown }>(
      apiClient.post(STUDY_PLAN_API_ROUTES.DIAGNOSTIC_COMPLETE(diagnosticId)),
    ),

  skipDiagnostic: (payload: {
    method: "historical" | "self_assessment";
    selfAssessment?: {
      subjectArea: SubjectArea;
      level: "beginner" | "intermediate" | "advanced";
    }[];
  }) =>
    unwrap<{ diagnosticResults: unknown }>(
      apiClient.post(STUDY_PLAN_API_ROUTES.DIAGNOSTIC_SKIP, payload),
    ),

  generatePlan: (payload: {
    templateId: string | null;
    parameters: StudyPlanParameters;
    diagnosticId: string | null;
    diagnosticMethod: "test" | "historical" | "self_assessment" | "none";
  }) =>
    unwrap<{ planId: string; summary: unknown }>(
      apiClient.post(STUDY_PLAN_API_ROUTES.GENERATE, payload),
    ),

  getActivePlan: (summary = false) =>
    unwrap<StudyPlan | null>(
      apiClient.get(STUDY_PLAN_API_ROUTES.ACTIVE, { params: { summary } }),
    ),

  getPlan: (planId: string) =>
    unwrap<StudyPlan>(apiClient.get(STUDY_PLAN_API_ROUTES.PLAN(planId))),

  getToday: (planId: string) =>
    unwrap<Record<string, unknown>>(apiClient.get(STUDY_PLAN_API_ROUTES.TODAY(planId))),

  getSession: (planId: string, sessionId: string) =>
    unwrap<Record<string, unknown>>(
      apiClient.get(STUDY_PLAN_API_ROUTES.SESSION(planId, sessionId)),
    ),

  startActivity: (planId: string, sessionId: string, activityId: string) =>
    unwrap<Record<string, unknown>>(
      apiClient.post(STUDY_PLAN_API_ROUTES.ACTIVITY_START(planId, sessionId, activityId)),
    ),

  completeActivity: (
    planId: string,
    sessionId: string,
    activityId: string,
    payload: {
      timeSpent?: number;
      result?: {
        score?: number;
        passed?: boolean;
        practiceSessionId?: string;
        assessmentSessionId?: string;
      };
    },
  ) =>
    unwrap<Record<string, unknown>>(
      apiClient.post(
        STUDY_PLAN_API_ROUTES.ACTIVITY_COMPLETE(planId, sessionId, activityId),
        payload,
      ),
    ),

  skipSession: (planId: string, sessionId: string) =>
    unwrap<Record<string, unknown>>(
      apiClient.post(STUDY_PLAN_API_ROUTES.SESSION_SKIP(planId, sessionId)),
    ),

  startModuleAssessment: (planId: string, moduleId: string) =>
    unwrap<{
      assessmentSessionId: string;
      questionCount: number;
      passThreshold: number;
      attemptNumber: number;
    }>(apiClient.post(STUDY_PLAN_API_ROUTES.MODULE_ASSESSMENT_START(planId, moduleId))),

  getAssessmentQuestions: (assessmentSessionId: string) =>
    unwrap<{ questions: unknown[] }>(
      apiClient.get(STUDY_PLAN_API_ROUTES.ASSESSMENT_QUESTIONS(assessmentSessionId)),
    ),

  saveAssessmentAnswer: (
    assessmentSessionId: string,
    payload: { questionId: string; answer: string; timeSpent?: number },
  ) =>
    unwrap<{ saved: true }>(
      apiClient.post(STUDY_PLAN_API_ROUTES.ASSESSMENT_ANSWER(assessmentSessionId), payload),
    ),

  submitAssessment: (assessmentSessionId: string) =>
    unwrap<Record<string, unknown>>(
      apiClient.post(STUDY_PLAN_API_ROUTES.ASSESSMENT_SUBMIT(assessmentSessionId)),
    ),

  getAssessmentReview: (assessmentSessionId: string) =>
    unwrap<Record<string, unknown>>(
      apiClient.get(STUDY_PLAN_API_ROUTES.ASSESSMENT_REVIEW(assessmentSessionId)),
    ),

  adaptPlan: (planId: string) =>
    unwrap<{
      adapted: boolean;
      changes: string[];
    }>(apiClient.post(STUDY_PLAN_API_ROUTES.ADAPT(planId))),

  reschedulePlan: (
    planId: string,
    payload: {
      newTargetDate?: string;
      newHoursPerDay?: number;
      newStudyDays?: number[];
      pauseUntil?: string;
    },
  ) =>
    unwrap<Record<string, unknown>>(
      apiClient.put(STUDY_PLAN_API_ROUTES.RESCHEDULE(planId), payload),
    ),

  pausePlan: (planId: string, payload?: { reason?: string; resumeDate?: string }) =>
    unwrap<Record<string, unknown>>(
      apiClient.post(STUDY_PLAN_API_ROUTES.PAUSE(planId), payload ?? {}),
    ),

  resumePlan: (planId: string) =>
    unwrap<Record<string, unknown>>(apiClient.post(STUDY_PLAN_API_ROUTES.RESUME(planId))),

  abandonPlan: (planId: string, payload?: { reason?: string }) =>
    unwrap<Record<string, unknown>>(
      apiClient.post(STUDY_PLAN_API_ROUTES.ABANDON(planId), payload ?? {}),
    ),

  getAnalytics: (planId: string) =>
    unwrap<Record<string, unknown>>(apiClient.get(STUDY_PLAN_API_ROUTES.ANALYTICS(planId))),

  getCalendar: () =>
    unwrap<{ planId: string; days: unknown[] }>(apiClient.get(STUDY_PLAN_API_ROUTES.CALENDAR)),
};

export const studyPlanAdminApi = {
  getTemplates: () =>
    unwrap<any[]>(apiClient.get(STUDY_PLAN_API_ROUTES.ADMIN_TEMPLATES)),

  createTemplate: (payload: Record<string, unknown>) =>
    unwrap<{ id: string }>(
      apiClient.post(STUDY_PLAN_API_ROUTES.ADMIN_TEMPLATES, payload),
    ),

  updateTemplate: (id: string, payload: Record<string, unknown>) =>
    unwrap<{ updated: true }>(
      apiClient.put(STUDY_PLAN_API_ROUTES.ADMIN_TEMPLATE(id), payload),
    ),

  getLessons: (params?: Record<string, unknown>) =>
    unwrap<any[]>(
      apiClient.get(STUDY_PLAN_API_ROUTES.ADMIN_LESSONS, { params }),
    ),

  createLesson: (payload: Record<string, unknown>) =>
    unwrap<{ id: string }>(
      apiClient.post(STUDY_PLAN_API_ROUTES.ADMIN_LESSONS, payload),
    ),

  updateLesson: (id: string, payload: Record<string, unknown>) =>
    unwrap<{ updated: true }>(
      apiClient.put(STUDY_PLAN_API_ROUTES.ADMIN_LESSON(id), payload),
    ),

  getAnalytics: () =>
    unwrap<Record<string, unknown>>(apiClient.get(STUDY_PLAN_API_ROUTES.ADMIN_ANALYTICS)),

  getUsers: () =>
    unwrap<any[]>(apiClient.get(STUDY_PLAN_API_ROUTES.ADMIN_USERS)),
};
