/**
 * Admin-side typed REST helpers built on top of the shared apiClient.
 */
import apiClient from "@/lib/api";
import type {
  ActivityLogEntry,
  AdminDashboardSummary,
  AdminQuestionListEntry,
  AdminUserListEntry,
  Announcement,
  BlogPost,
  BlogPostSummary,
  BlogStatus,
  PaginatedResult,
  Passage,
  PlatformSettings,
  Question,
  QuestionFlag,
  QuestionImportBatch,
  QuestionMediaAsset,
  QuestionPublicationStatus,
  SeoOverride,
  UrlRedirect,
} from "@upcat/shared";
import {API_ROUTES} from "@upcat/shared";

/** Unwrap `{·data: T·}` envelope used by the API. */
async function unwrap<T>(promise: Promise<{·data: {·data: T·}}>): Promise<T> {
  const {data} = await promise;
  return data.data;
}

/** Unwrap raw JSON body (no envelope) — used by blog admin endpoints. */
async function unwrapRaw<T>(promise: Promise<{·data: T·}>): Promise<T> {
  const {data} = await promise;
  return data;
}

/** SEO override row as returned by the admin overrides listing. */
export interface SeoOverridePageRow {
  path: string;
  defaults: {
    title: string;
    description: string;
    keywords: string[];
    indexable: boolean;
  };
  override: SeoOverride | null;
}

export interface SeoOverridesResponse {
  pages: SeoOverridePageRow[];
  overrides: SeoOverride[];
}

export interface SitemapStatus {
  siteUrl: string;
  sitemapUrl: string;
  totalIndexablePages: number;
  pagesInSitemap: number;
  pagesHiddenByOverride: number;
  overridesCount: number;
  generatedAt: string;
}

export interface BlogListResponse {
  items: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminQuestionSet {
  _id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  questionCount?: number;
  totalQuestions: number;
  totalTimeLimit: number;
  distribution: Record<string, {·questions: number;·timeLimit: number}};
  difficultyMix: {
    easy: number;
    medium: number;
    hard: number;
    very_hard: number;
  };
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export const adminApi = {
  // Dashboard Analytics
  dashboardSummary: () => unwrap<AdminDashboardSummary>(apiClient.get(API_ROUTES.ADMIN.DASHBOARD)),
  dashboardActivity: (limit = 100) =>
    unwrap<{·items: ActivityLogEntry[]}>(apiClient.get(`/admin/dashboard/activity?limit=${limit}`))
    .then((d) => d.items),
  analytics: (period: "week" | "month" | "year" | "all" = "month") =>
    unwrap<Record<string, unknown>>(apiClient.get(`${API_ROUTES.ADMIN.ANALYTICS}?period=${period}`)),
    auditLog: (params: Record<string, string | number | undefined) => {} =>
      unwrap<PaginatedResult<ActivityLogEntry>>(
        apiClient.get(API_ROUTES.ADMIN.AUDIT_LOG, {params}),
      );
};
// --- Questions ----------------------------------------------------------

listQuestions: (params: Record<string, string> | number | boolean | undefined) => {})
const sanitized = {...params};
// Support both setId (legacy) and id
if (params.id && !params.setId) {
  sanitized.setId = params.id;
  delete sanitized.id;
}
return unwrap<PaginatedResult<AdminQuestionListEntry>>(
  apiClient.get(API_ROUTES.ADMIN.QUESTIONS, {params: sanitized})
);
getQuestion: (id: string) =>
unwrap({
  question: Question;
  usageCount: number;
  flagHistory: QuestionFlag[
  ]>(apiClient.get(API_ROUTES.ADMIN.QUESTION(id))),
createQuestion: (body: Partial<Question> && { passageId?: string | null }) =>
unwrapQuestion(apiClient.post(API_ROUTES.ADMIN.QUESTIONS, body)),
updateQuestion: (id: string, body: Partial<Question>) =>
unwrap({ updated: boolean })(apiClient.put(API_ROUTES.ADMIN.QUESTION(id), body)),
deleteQuestion: (id: string) =>
unwrap({ deleted: boolean })(apiClient.delete(API_ROUTES.ADMIN.QUESTION(id))),
bulkDeleteQuestions: (ids: string[]) =>
unwrap({ deleted: number })(apiClient.post(API_ROUTES.ADMIN.QUESTIONS_BULK_DELETE, {ids})),
importQuestions: (format: "json" | "csv", data: string | Record<string, unknown>[] | {
  passages: Record<string, unknown>[];
  questions: Record<string, unknown>[]}
),
setId: string,
) =>
unwrap({
  batchId: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  passagesDetected: number;
  rows: Array<{ rowNumber: number; status: string; error?: string; duplicateQuestionId?: string }>();
}(apiClient.post(API_ROUTES.ADMIN.QUESTIONS_IMPORT_PREVIEW, {format, data, setId})),
confirmQuestionImport: (
  batchId: string,
  mode: "skip_duplicates" | "insert_all" | "replace_exact",
  setId: string,
) => unwrap({ inserted: number; updated: number; skipped: number; mode: string })(apiClient.post(API_ROUTES.ADMIN.QUESTIONS_IMPORT_CONFIRM, {batchId, mode, setId})),
getQuestionImportBatch: (id: string) =>
unwrapQuestionImportBatch(apiClient.get(API_ROUTES.ADMIN.QUESTIONS_IMPORT_BATCH(id))),
undoQuestionImportBatch: (id: string) =>
unwrap{ revertedInserts: number; revertedUpdates: number }(apiClient.post(API_ROUTES.ADMIN.QUESTIONS_IMPORT_BATCH_UNDO(id))),
exportQuestions: async (
  params: {
    format?: "json" | "csv";
    status?: string;
    includeDeleted?: boolean;
    search?: string;
    subjectArea?: string;
    subtopic?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    setId?: string;
  } = {},
) => {
  const response = await apiClient.get(API_ROUTES.ADMIN.QUESTIONS_EXPORT, {
    params,
    responseType: "blob",
  });
  return {
    blob: response.data as Blob,
    contentType: response.headers?.["content-type"] as string | undefined,
    contentDisposition: response.headers?.["content-disposition"] as string | undefined,
  };
},
exportQuestionsUrl: (params: {
    format?: "json" | "csv";
    status?: string;
    includeDeleted?: boolean;
    search?: string;
    subjectArea?: string;
    subtopic?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    setId?: string;
} = {},
const base = `${import.meta.env.VITE_API_URL || "/api"}${API_ROUTES.ADMIN.QUESTIONS_EXPORT}`;
const query = new URLSearchParams();
if (params.format) query.set("format", params.format);
if (params.status) query.set("status", params.status);
if (params.includeDeleted !== undefined) query.set("includeDeleted", String(params.includeDeleted));
if (params.search) query.set("search", params.search);
if (params.subjectArea) query.set("subjectArea", params.subjectArea);
if (params.subtopic) query.set("subtopic", params.subtopic);
if (params.topic) query.set("topic", params.topic);
if (params.difficulty) query.set("difficulty", params.difficulty);
if (params.type) query.set("type", params.type);
return query.toString()? `${base}?${query.toString()}`: base;
},
transitionQuestionWorkflow: (id: string, status: QuestionPublicationStatus, note?: string) =>
unwrap<{ questionId: string } from: QuestionPublicationStatus; to: QuestionPublicationStatus; version: number}>
apiClient.post(API_ROUTES.ADMIN.QUESTION_WORKFLOW(id), {status, note}),
getQuestionVersions: (id: string) =>
unwrap{
items: Array<
  _id: string;
  questionId: string;
  version: number;
  editedBy: string | null;
  editedAt: string;
  note: string
}>
apiClient.get(API_ROUTES.ADMIN.QUESTION_VERSIONS(id)),
listQuestionMediaAssets: (params: Record<string, string | number | boolean | undefined> = {}) =>
unwrap<PaginatedResult<QuestionMediaAsset>>(
apiClient.get(API_ROUTES.ADMIN.QUESTION_MEDIA_ASSETS, {params}),
uploadQuestionMediaAsset: (body: {
filename: string;
mimeType: string;
base64Data: string;
kind: "image" | "audio" | "video" | "other";
altText?: string;
caption?: string
}) => unwrap<QuestionMediaAsset & {deduped?: boolean}>(
apiClient.post(API_ROUTES.ADMIN.QUESTION_MEDIA_ASSETS, body),
deleteQuestionMediaAsset: (id: string) =>
unwrap<{ deleted: boolean }>(apiClient.delete(API_ROUTES.ADMIN.QUESTION_MEDIA_ASSET(id))),

// — Passages —
listPassages: (params: Record<string, string | number | undefined> = {}) =>
unwrap<PaginatedResult<Passage & {questionCount: number}>>(
apiClient.get(API_ROUTES.ADMIN.PASSAGES, {params}),
getPassage: (id: string) =>
unwrap<{ passage: Passage; questions: Question[] }>(
apiClient.get(API_ROUTES.ADMIN.PASSAGE(id)),
createPassage: (body: PartialPassage) =>
unwrap<Passage>(apiClient.post(API_ROUTES.ADMIN.PASSAGES, body)),
updatePassage: (id: string, body: PartialPassage) =>
unwrap<{ updated: boolean }>(apiClient.put(API_ROUTES.ADMIN.PASSAGE(id), body)),
deletePassage: (id: string) =>
unwrap<{ deleted: boolean }>(apiClient.delete(API_ROUTES.ADMIN.PASSAGE(id))),

// — Users —
listUsers: (params: Record<string, string | number | undefined> = {}) =>
unwrap<PaginatedResult<AdminUserListEntry>>(
apiClient.get(API_ROUTES.ADMIN.USERS, {params}),
getUser: (id: string) =>
unwrap<Record<string, unknown>>(apiClient.get(API_ROUTES.ADMIN.USER(id))),
updateUser: (id: string, body: Record<string, unknown>) =>
unwrap<{ updated: boolean }>(apiClient.put(API_ROUTES.ADMIN.USER(id), body)),
createUser: (body: Record<string, unknown>) =>
unwrap<Record<string, unknown>>(apiClient.post(API_ROUTES.ADMIN.USER_CREATE, body)),
deactivateUser: (id: string, reason?: string) =>
unwrap<{ ok: boolean }>(
apiClient.post(API_ROUTES.ADMIN.USER_DEACTIVATE(id), {reason}),
reactivateUser: (id: string) =>
unwrap<{ ok: boolean }>(apiClient.post(API_ROUTES.ADMIN.USER_REACTIVATE(id))),
resetUserPassword: (id: string) =>
unwrap<{ ok: boolean }>(apiClient.post(API_ROUTES.ADMIN.USER_RESET_PASSWORD(id))),
verifyUserEmail: (id: string) =>
unwrap<{ ok: boolean }>(apiClient.post(API_ROUTES.ADMIN.USER_VERIFY_EMAIL(id))),
setUserPremium: (
id: string,
body: { periodDays?: number; planId?: string; reason?: string } = {},
) =>
unwrap<{ upgraded: boolean; subscription: { tier: "free" | "premium"; endDate: string | null } }>(
apiClient.post(API_ROUTES.ADMIN.USER_UPGRADE(id), body),
setUserFree: (
id: string,
body: { immediate?: boolean; reason?: string } = {},
) =>
unwrap<{ downgraded: boolean; subscription: Record<string, unknown> }>(
apiClient.post(API_ROUTES.ADMIN.USER_DOWNGRADE(id), body),
extendUserPremium: (
id: string,
body: { days: number; reason?: string },
) =>
unwrap<{ extended: boolean; newEndDate: string | null }>(
apiClient.post(API_ROUTES.ADMIN.USER_EXTEND(id), body),
exportUsersUrl: () => `${import.meta.env.VITE_API_URL || "/api"}${API_ROUTES.ADMIN.USERS_EXPORT}`,

// — Exams —
listExams: (params: Record<string, string | number | undefined> = {}) =>
unwrap<PaginatedResult<Record<string, unknown>>>(
apiClient.get(API_ROUTES.ADMIN.EXAMS, {params}),
getExam: (id: string) =>
unwrap<Record<string, unknown>>(apiClient.get(API_ROUTES.ADMIN.EXAM(id))),
deleteExam: (id: string) =>
unwrap<{ deleted: boolean }>(apiClient.delete(API_ROUTES.ADMIN.EXAM(id))),

// — Practice sessions —
listPracticeSessions: (params: Record<string, string | number | undefined) => {} =>
unwrap<PaginatedResult<Record<string, unknown>>>(
apiClient.get("/admin/practice-sessions", {params}),
),

deletePracticeSession: (id: string) =>
unwrap<{ deleted: boolean }>(apiClient.delete(`/admin/practice-sessions/${id}`)),

// — Content flags —
listFlags: (params: Record<string, string | number | undefined) => {} =>
unwrap<PaginatedResult<QuestionFlag & { question: Record<string, unknown>; user: Record<string, unknown> }>>(
apiClient.get(API_ROUTES.ADMIN.FLAGS, {params}),
),

updateFlag: (id: string, body: { status: string; resolutionNote?: string }) =>
unwrap<{ updated: boolean }>(apiClient.put(API_ROUTES.ADMIN.FLAG(id), body)),
flagsSummary: () =>
unwrap<{ byStatus: Record<string, number>; byReason: Record<string, number> }>(
apiClient.get(API_ROUTES.ADMIN.FLAGS_SUMMARY),
),

// — Announcements —
listAnnouncements: () =>
unwrap<Announcement[]>(apiClient.get(API_ROUTES.ADMIN.ANNOUNCEMENTS)),
createAnnouncement: (body: Partial<Announcement>) =>
unwrap<Announcement>(apiClient.post(API_ROUTES.ADMIN.ANNOUNCEMENTS, body)),
updateAnnouncement: (id: string, body: Partial<Announcement>) =>
unwrap<{ updated: boolean }>(apiClient.put(API_ROUTES.ADMIN.ANNOUNCEMENT(id), body)),
deleteAnnouncement: (id: string) =>
unwrap<{ deleted: boolean }>(apiClient.delete(API_ROUTES.ADMIN.ANNOUNCEMENT(id))),
publishAnnouncements: () =>
unwrap{
exported: boolean;
contentSize: number;
payload: Record<string, unknown>;
}>(apiClient.post("/admin/announcements/publish")),

// — Settings —
getSettings: () => unwrap<PlatformSettings>(apiClient.get(API_ROUTES.ADMIN.SETTINGS)),
saveSettings: (patch: Partial<PlatformSettings>) =>
unwrap<PlatformSettings>(apiClient.put(API_ROUTES.ADMIN.SETTINGS, patch)),
publishAdsConfig: () =>
unwrap{
exported: boolean;
contentSize: number;
payload: Record<string, unknown>;
}>(apiClient.post("/admin/ads/publish")),

// — SEO —
listSeoOverrides: () =>
unwrap<SeoOverridesResponse>(apiClient.get("/admin/seo/overrides")),
publishSeoOverrides: () =>
unwrap{
exported: boolean;
contentSize: number;
payload: Record<string, unknown>;
}>(apiClient.post("/admin/seo/publish")),
upsertSeoOverride: (body: Partial<SeoOverride> & { path: string }) =>
unwrap<SeoOverride>(apiClient.put("/admin/seo/overrides", body)),
deleteSeoOverride: (path: string) =>
unwrap{ removed: boolean }(
apiClient.delete("/admin/seo/overrides", {params: {path}}),
),

listRedirects: () => unwrap<UrlRedirect[]>(apiClient.get("/admin/seo/redirects")),
createRedirect: (body: {
source: string;
destination: string;
type: 301 | 302;
isActive: boolean;
}) => unwrap<UrlRedirect>(apiClient.post("/admin/seo/redirects", body)),
updateRedirect: (
id: string,
body: { source: string; destination: string; type: 301 | 302; isActive: boolean },
) => unwrap{ updated: boolean }(apiClient.put(`/admin/seo/redirects/${id}`, body)),
deleteRedirect: (id: string) =>
unwrap{ deleted: boolean }(apiClient.delete(`/admin/seo/redirects/${id}`)),
getSitemapStatus: () =>
unwrap<SitemapStatus>(apiClient.get("/admin/seo/sitemap-status")),

// — Blog —
listBlogPosts: (params: { page?: number; status?: BlogStatus | "any" } => {} =>
unwrapRaw<BlogListResponse>(apiClient.get("/admin/blog", {params})),
getBlogPost: (id: string) => unwrapRaw<BlogPost>(apiClient.get(`/admin/blog/${id}`)),
createBlogPost: (body: Partial<BlogPost>) =>
unwrapRaw<BlogPost>(apiClient.post("/admin/blog", body)),
updateBlogPost: (id: string, body: Partial<BlogPost>) =>
unwrapRaw<BlogPost>(apiClient.put(`/admin/blog/${id}`, body)),
deleteBlogPost: (id: string) =>
apiClient.delete(`/admin/blog/${id}`).then(() => ({deleted: true})),

// — Help center admin —
listHelpArticles: (params: Record<string, string | number | undefined) => {} =>
unwrap{ items: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(
apiClient.get(API_ROUTES.ADMIN.HELP_ARTICLES, {params}),
),

createHelpArticle: (body: Record<string, unknown>) =>
unwrap{ created: boolean; slug: string }(apiClient.post(API_ROUTES.ADMIN.HELP_ARTICLES, body)),
updateHelpArticle: (slug: string, body: Record<string, unknown>) =>
unwrap{ updated: boolean }(apiClient.put(API_ROUTES.ADMIN.HELP_ARTICLE(slug), body)),
archiveHelpArticle: (slug: string) =>
unwrap({ archived: boolean })(apiClient.delete(API_ROUTES.ADMIN.HELP_ARTICLE(slug))),
publishHelpContent: () =>
unwrap({
exported: boolean;
contentSize: number;
payload: Record<string, unknown>;
})(apiClient.post("/admin/help/publish")),

listContextualHelp: () =>
unwrap({ items: Array<Record<string, unknown>> })(apiClient.get(API_ROUTES.ADMIN.HELP_CONTEXTUAL)),
createContextualHelp: (body: Record<string, unknown>) =>
unwrap({ created: boolean; id: string })(apiClient.post(API_ROUTES.ADMIN.HELP_CONTEXTUAL, body)),
updateContextualHelp: (id: string, body: Record<string, unknown>) =>
unwrap({ updated: boolean })(apiClient.put(API_ROUTES.ADMIN.HELP_CONTEXTUAL_ID(id), body)),

listOnboardingFlows: () =>
unwrap({ items: Array<Record<string, unknown>> })(apiClient.get(API_ROUTES.ADMIN.HELP_ONBOARDING)),
updateOnboardingFlow: (flowId: string, body: Record<string, unknown>) =>
unwrap({ updated: boolean; upserted: boolean })(
apiClient.put(API_ROUTES.ADMIN.HELP_ONBOARDING_FLOW(flowId), body),
),

helpAnalytics: () => unwrap(Record<string, unknown>>(apiClient.get(API_ROUTES.ADMIN.HELP_ANALYTICS))),

// — Monitoring —
monitoringDashboard: (range: "1h" | "6h" | "24h" | "7d" = "1h") =>
unwrap(Record<string, unknown>)(apiClient.get(`/admin/monitoring/dashboard?range=${range}`)),
monitoringLogs: (params: Record<string, string | number | undefined> = {}) =>
unwrap({
items: Array<Record<string, unknown>>;
total: number;
page: number;
limit: number;
totalPages: number;
})(apiClient.get("/admin/monitoring/logs", {params})),
monitoringMetrics: (params: Record<string, string | number | undefined> = {}) =>
unwrap({ name: string; range: string; points: Array<Record<string, unknown>> })(
apiClient.get("/admin/monitoring/metrics", {params}),
),
monitoringAlerts: (params: Record<string, string | number | undefined> = {}) =>
unwrap({
items: Array<Record<string, unknown>>;
total: number;
page: number;
limit: number;
totalPages: number;
})(apiClient.get("/admin/monitoring/alerts", {params})),
monitoringAcknowledgeAlert: (id: string, notes?: string) =>
unwrap({ success: boolean })(apiClient.put(`/admin/monitoring/alerts/${id}/acknowledge`), {notes}),
monitoringResolveAlert: (id: string, notes?: string, rootCause?: string) =>
unwrap({ success: boolean })(apiClient.put(`/admin/monitoring/alerts/${id}/resolve`), {notes, rootCause}),
monitoringSilenceAlert: (id: string, silenceMinutes = 30, notes?: string) =>
unwrap({ success: boolean })(
apiClient.put(`/admin/monitoring/alerts/${id}/silence`), {silenceMinutes, notes}),
monitoringTestAlert: () =>
unwrap(Record<string, unknown>)(apiClient.post("/admin/monitoring/test-alert")),
monitoringAlertRules: () =>
unwrap(Array<Record<string, unknown>>(apiClient.get("/admin/monitoring/alert-rules")),
monitoringSeedAlertRules: () =>
unwrap({ seeded: number })(apiClient.post("/admin/monitoring/alert-rules/seed-defaults")),
monitoringHealthChecks: () =>
unwrap(Array<Record<string, unknown>>(apiClient.get("/admin/monitoring/health-checks")),
monitoringRunAllHealthChecks: () =>
unwrap(Record<string, unknown>)(apiClient.post("/admin/monitoring/health-checks/run-all")),
monitoringRunHealthCheck: (checkId: string) =>
unwrap(Record<string, unknown>)(apiClient.post("/admin/monitoring/health-checks/${checkId}/run")),
monitoringConfig: () =>
unwrap(Record<string, unknown>)(apiClient.get("/admin/monitoring/config")),
monitoringSaveConfig: (patch: Record<string, unknown>) =>
unwrap(Record<string, unknown>)(apiClient.put("/admin/monitoring/config", patch)),
monitoringReport: (range: "1h" | "6h" | "24h" | "7d" = "24h") =>
unwrap(Record<string, unknown>)(apiClient.get(`/admin/monitoring/reports?range=${range}`)),
monitoringEvaluateRules: () =>
unwrap(Record<string, unknown>)(apiClient.get("/admin/monitoring/reports/evaluate-rules")),

// — Question Sets —
getQuestionSets: (params: Record<string, string | number | boolean | undefined> = {}) =>
unwrap(PaginatedResult<AdminQuestionSet>>(apiClient.get("/admin/question-sets", {params})),
getQuestionSet: (id: string) =>
unwrap(AdminQuestionSet)(apiClient.get(`/admin/question-sets/${id}`)),
createQuestionSet: <T extends object>(body: T) =>
unwrap(AdminQuestionSet)(apiClient.post("/admin/question-sets", body)),
updateQuestionSet: <T extends object>(id: string, body: T) =>
unwrap(AdminQuestionSet)(apiClient.put(`/admin/question-sets/${id}`, body)),
deleteQuestionSet: (id: string) =>
unwrap(AdminQuestionSet)(apiClient.delete(`/admin/question-sets/${id}`)),
};

/** Public endpoints used by the reviewee app. */
export const publicApi = {
announcements: () => unwrap(Announcement[])(apiClient.get(API_ROUTES.ANNOUNCEMENTS)),
status: () => apiClient.get(API_ROUTES.STATUS).then(({data}) => ({success: Boolean(data?.success)})),
flagQuestion: (questionId: string, body: {reason: string; comment?: string}) =>
unwrap({_id: string})(apiClient.post(API_ROUTES.FLAG_QUESTION(questionId), body)),
};