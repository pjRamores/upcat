import {lazy, Suspense} from "react";
import {createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError,} from "react-router-dom";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import FullPageLoader from "@/components/FullPageLoader";
import {useAuthStore} from "@/stores/authStore";

/* _____________________________________________________________________________________
 * Routes - every page is code-split so the initial JS payload only
 * loads the landing page (or whichever route the user first hits).
 * _____________________________________________________________________________________ */

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const BatchExamPage = lazy(() => import("@/pages/BatchExamPage"));
const ResultsPage = lazy(() => import("@/pages/ResultsPage"));
const ReviewPage = lazy(() => import("@/pages/ReviewPage"));
const StatsPage = lazy(() => import("@/pages/StatsPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const PaymentPage = lazy(() => import("@/pages/PaymentPage"));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccessPage"));
const PaymentProcessingPage = lazy(() => import("@/pages/PaymentProcessingPage"));
const PaymentFailedPage = lazy(() => import("@/pages/PaymentFailedPage"));
const PaymentCancelledPage = lazy(() => import("@/pages/PaymentCancelledPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AccountPaymentsPage = lazy(() => import("@/pages/AccountPaymentsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const PracticePage = lazy(() => import("@/pages/PracticePage"));
const PracticeSessionPage = lazy(() => import("@/pages/PracticeSessionPage"));
const PracticeStatsPage = lazy(() => import("@/pages/PracticeStatsPage"));
const StudyPlanHubPage = lazy(() => import("@/pages/StudyPlanHubPage"));
const StudyPlanSetupPage = lazy(() => import("@/pages/StudyPlanSetupPage"));
const StudyPlanDiagnosticPage = lazy(() => import("@/pages/StudyPlanDiagnosticPage"));
const StudyPlanSessionPage = lazy(() => import("@/pages/StudyPlanSessionPage"));
const StudyPlanAssessmentPage = lazy(() => import("@/pages/StudyPlanAssessmentPage"));
const StudyPlanCalendarPage = lazy(() => import("@/pages/StudyPlanCalendarPage"));
const StudyPlanAnalyticsPage = lazy(() => import("@/pages/StudyPlanAnalyticsPage"));
const StudyPlanSettingsPage = lazy(() => import("@/pages/StudyPlanSettingsPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const SubjectMathPage = lazy(() => import("@/pages/subjects/SubjectMathPage"));
const SubjectSciencePage = lazy(() => import("@/pages/subjects/SubjectSciencePage"));
const SubjectLanguagePage = lazy(() => import("@/pages/subjects/SubjectLanguagePage"));
const SubjectReadingPage = lazy(() => import("@/pages/subjects/SubjectReadingPage"));

const BlogListPage = lazy(() => import("@/pages/BlogListPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const HelpCenterPage = lazy(() => import("@/pages/HelpCenterPage"));
const HelpCategoryPage = lazy(() => import("@/pages/HelpCategoryPage"));
const HelpArticlePage = lazy(() => import("@/pages/HelpArticlePage"));
const HelpSearchPage = lazy(() => import("@/pages/HelpSearchPage"));

const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminQuestionsPage = lazy(() => import("@/pages/admin/AdminQuestionsPage"));
const AdminQuestionEditPage = lazy(() => import("@/pages/admin/AdminQuestionEditPage"));
const AdminQuestionWorkflowPage = lazy(() => import("@/pages/admin/AdminQuestionWorkflowPage"));
const AdminQuestionImportExportPage = lazy(() => import("@/pages/admin/AdminQuestionImportExportPage"));
const AdminQuestionMediaLibraryPage = lazy(() => import("@/pages/admin/AdminQuestionMediaLibraryPage"));
const AdminQuestionSetsPage = lazy(() => import("@/pages/admin/AdminQuestionSetsPage"));
const AdminPassagesPage = lazy(() => import("@/pages/admin/AdminPassagesPage"));
const AdminPassageEditPage = lazy(() => import("@/pages/admin/AdminPassageEditPage"));
const AdminContentFlagsPage = lazy(() => import("@/pages/admin/AdminContentFlagsPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("@/pages/admin/AdminUserDetailPage"));
const AdminUserNewPage = lazy(() => import("@/pages/admin/AdminUserNewPage"));
const AdminExamsPage = lazy(() => import("@/pages/admin/AdminExamsPage"));
const AdminExamDetailPage = lazy(() => import("@/pages/admin/AdminExamDetailPage"));
const AdminPracticeSessionsPage = lazy(() => import("@/pages/admin/AdminPracticeSessionsPage"));
const AdminAnnouncementsPage = lazy(() => import("@/pages/admin/AdminAnnouncementsPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminAuthProvidersPage = lazy(() => import("@/pages/admin/AdminAuthProvidersPage"));
const AdminAuditLogPage = lazy(() => import("@/pages/admin/AdminAuditLogPage"));
const AdminGamificationPage = lazy(() => import("@/pages/admin/AdminGamificationPage"));
const AdminSecurityPage = lazy(() => import("@/pages/admin/AdminSecurityPage"));
const AdminMonitoringPage = lazy(() => import("@/pages/admin/AdminMonitoringPage"));

const AdminSupportDashboardPage = lazy(
    () => import("@/pages/admin/AdminSupportDashboardPage"),
);
const AdminSupportTicketsPage = lazy(
    () => import("@/pages/admin/AdminSupportTicketsPage"),
);
const AdminSupportTicketDetailPage = lazy(
    () => import("@/pages/admin/AdminSupportTicketDetailPage"),
);
const AdminMergeWizardPage = lazy(() => import("@/pages/admin/AdminMergeWizardPage"));
const AdminIdentityDisputesPage = lazy(
    () => import("@/pages/admin/AdminIdentityDisputesPage"),
);
const AdminDataRequestsPage = lazy(() => import("@/pages/admin/AdminDataRequestsPage"));

const AdminAdsSettingsPage = lazy(() => import("@/pages/admin/AdminAdsSettingsPage"));
const AdminSeoPage = lazy(() => import("@/pages/admin/AdminSeoPage"));
const AdminBlogPage = lazy(() => import("@/pages/admin/AdminBlogPage"));
const AdminBlogEditPage = lazy(() => import("@/pages/admin/AdminBlogEditPage"));
const AdminPaymentConfigPage = lazy(() => import("@/pages/admin/AdminPaymentConfigPage"));
const AdminPaymentSubmissionsPage = lazy(() => import("@/pages/admin/AdminPaymentSubmissionsPage"));
const AdminPromoCodesPage = lazy(() => import("@/pages/admin/AdminPromoCodesPage"));
const AdminStudyPlanTemplatesPage = lazy(() => import("@/pages/admin/AdminStudyPlanTemplatesPage"));
const AdminStudyPlanLessonsPage = lazy(() => import("@/pages/admin/AdminStudyPlanLessonsPage"));
const AdminStudyPlanAnalyticsPage = lazy(() => import("@/pages/admin/AdminStudyPlanAnalyticsPage"));
const AdminHelpArticlesPage = lazy(() => import("@/pages/admin/AdminHelpArticlesPage"));
const AdminHelpContextualPage = lazy(() => import("@/pages/admin/AdminHelpContextualPage"));
const AdminHelpOnboardingPage = lazy(() => import("@/pages/admin/AdminHelpOnboardingPage"));
const AdminHelpAnalyticsPage = lazy(() => import("@/pages/admin/AdminHelpAnalyticsPage"));
const AdminFeaturesPage = lazy(() => import("@/pages/admin/AdminFeaturesPage"));

const RecoverAccountPage = lazy(() => import("@/pages/RecoverAccountPage"));
const RecoverAccountResetPage = lazy(() => import("@/pages/RecoverAccountResetPage"));
const GuestSupportPage = lazy(() => import("@/pages/GuestSupportPage"));
const SupportTicketsPage = lazy(() => import("@/pages/SupportTicketsPage"));
const SupportTicketDetailPage = lazy(() => import("@/pages/SupportTicketDetailPage"));
const DeletionConfirmPage = lazy(() => import("@/pages/DeletionConfirmPage"));

/** Wraps a route element with a Suspense boundary for lazy chunks. */
function lazyRoute(Component: React.ComponentType): React.ReactElement {
    return (
        <Suspense fallback={<FullPageLoader/>}>
            <Component/>
        </Suspense>
    );
}

/** Redirect admins away from dead links to the admin panel root. */
function RoleAwareNotFound(): React.ReactElement {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const role = useAuthStore((s) => s.role());

    if (isAuthenticated && role === "admin") {
        return <Navigate to="/admin" replace/>;
    }

    return lazyRoute(NotFoundPage);
}

function AppRouteError(): React.ReactElement {
    const error = useRouteError();
    const message =
        error instanceof Error
            ? error.message
            : isRouteErrorResponse(error)
                ? `${error.status} ${error.statusText}`
                : "Something went wrong while loading this page.";

    const isChunkLoadFailure =
        typeof message === "string" &&
        message.toLowerCase().includes("failed to fetch dynamically imported module");

    return (
        <div
            className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Page failed to load</h1>
            <p className="mt-3 text-sm text-slate-600">
                {isChunkLoadFailure
                    ? "A new app version was detected while this page was loading."
                    : "We hit an unexpected error while rendering this route."}
            </p>
            <p className="mt-2 max-w-xl rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {message}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                    type="button"
                    className="rounded-md bg-maroon-600 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-700"
                    onClick={() => window.location.reload()}
                >
                    Reload page
                </button>
                <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => window.location.assign("/practice")}
                >
                    Back to practice
                </button>
            </div>
        </div>
    );
}

export const router = createBrowserRouter([
    // Admin tree (own layout, no Navbar) --
    {
        element: <ProtectedRoute requiredRole="admin"/>,
        errorElement: <AppRouteError/>,
        children: [
            {
                path: "/admin",
                element: lazyRoute(AdminLayout),
                children: [
                    {index: true, element: lazyRoute(AdminDashboardPage)},
                    {path: "analytics", element: lazyRoute(AdminAnalyticsPage)},
                    {path: "questions", element: lazyRoute(AdminQuestionsPage)},
                    {path: "questions/new", element: lazyRoute(AdminQuestionEditPage)},
                    {path: "questions/:id", element: lazyRoute(AdminQuestionEditPage)},
                    {path: "questions/workflow", element: lazyRoute(AdminQuestionWorkflowPage)},
                    {path: "questions/import-export", element: lazyRoute(AdminQuestionImportExportPage)},
                    {path: "question-sets", element: lazyRoute(AdminQuestionSetsPage)},
                    {path: "questions/media", element: lazyRoute(AdminQuestionMediaLibraryPage)},
                    {path: "passages", element: lazyRoute(AdminPassagesPage)},
                    {path: "passages/new", element: lazyRoute(AdminPassageEditPage)},
                    {path: "passages/:id", element: lazyRoute(AdminPassageEditPage)},
                    {path: "content-flags", element: lazyRoute(AdminContentFlagsPage)},
                    {path: "users", element: lazyRoute(AdminUsersPage)},
                    {path: "users/new", element: lazyRoute(AdminUserNewPage)},
                    {path: "users/:id", element: lazyRoute(AdminUserDetailPage)},
                    {path: "exams", element: lazyRoute(AdminExamsPage)},
                    {path: "exams/:id", element: lazyRoute(AdminExamDetailPage)},
                    {path: "practice-sessions", element: lazyRoute(AdminPracticeSessionsPage)},
                    {path: "announcements", element: lazyRoute(AdminAnnouncementsPage)},
                    {path: "settings", element: lazyRoute(AdminSettingsPage)},
                    {path: "auth-providers", element: lazyRoute(AdminAuthProvidersPage)},
                    {path: "audit-log", element: lazyRoute(AdminAuditLogPage)},
                    {path: "gamification", element: lazyRoute(AdminGamificationPage)},
                    {path: "security", element: lazyRoute(AdminSecurityPage)},
                    {path: "monitoring", element: lazyRoute(AdminMonitoringPage)},
                    {path: "support", element: lazyRoute(AdminSupportDashboardPage)},
                    {path: "support/tickets", element: lazyRoute(AdminSupportTicketsPage)},
                    {
                        path: "support/tickets/:ticketNumber",
                        element: lazyRoute(AdminSupportTicketDetailPage),
                    },
                    {path: "support/merge", element: lazyRoute(AdminMergeWizardPage)},
                    {
                        path: "support/identity-disputes",
                        element: lazyRoute(AdminIdentityDisputesPage),
                    },
                    {path: "data-requests", element: lazyRoute(AdminDataRequestsPage)},
                    {path: "ads", element: lazyRoute(AdminAdsSettingsPage)},
                    {path: "payment/config", element: lazyRoute(AdminPaymentConfigPage)},
                    {path: "payment/submissions", element: lazyRoute(AdminPaymentSubmissionsPage)},
                    {path: "features", element: lazyRoute(AdminFeaturesPage)},
                    {path: "promo-codes", element: lazyRoute(AdminPromoCodesPage)},
                    {path: "study-plans/templates", element: lazyRoute(AdminStudyPlanTemplatesPage)},
                    {path: "study-plans/lessons", element: lazyRoute(AdminStudyPlanLessonsPage)},
                    {path: "study-plans/analytics", element: lazyRoute(AdminStudyPlanAnalyticsPage)},
                    {path: "help/articles", element: lazyRoute(AdminHelpArticlesPage)},
                    {path: "help/contextual", element: lazyRoute(AdminHelpContextualPage)},
                    {path: "help/onboarding", element: lazyRoute(AdminHelpOnboardingPage)},
                    {path: "help/analytics", element: lazyRoute(AdminHelpAnalyticsPage)},
                    {path: "seo", element: lazyRoute(AdminSeoPage)},
                    {path: "blog", element: lazyRoute(AdminBlogPage)},
                    {path: "blog/new", element: lazyRoute(AdminBlogEditPage)},
                    {path: "blog/:id", element: lazyRoute(AdminBlogEditPage)},
                ],
            },
        ],
    },

    // — Reviewee / public tree (Navbar + Footer Layout) —
    {
        element: <Layout/>,
        errorElement: <AppRouteError/>,
        children: [
            // — Public routes —
            {path: "/", element: lazyRoute(LandingPage)},
            {path: "/login", element: lazyRoute(LoginPage)},
            {path: "/register", element: lazyRoute(RegisterPage)},
            {path: "/verify-email", element: lazyRoute(VerifyEmailPage)},
            {path: "/maintenance", element: lazyRoute(lazy(() => import("@/pages/MaintenancePage")))},
            {path: "/forgot-password", element: lazyRoute(ForgotPasswordPage)},
            {path: "/reset-password", element: lazyRoute(ResetPasswordPage)},
            {path: "/terms", element: lazyRoute(TermsPage)},
            {path: "/privacy", element: lazyRoute(PrivacyPage)},
            {path: "/contact", element: lazyRoute(ContactPage)},
            {path: "/pricing", element: lazyRoute(PricingPage)},
            {path: "/payment/success", element: lazyRoute(PaymentSuccessPage)},
            {path: "/payment/processing", element: lazyRoute(PaymentProcessingPage)},
            {path: "/payment/failed", element: lazyRoute(PaymentFailedPage)},
            {path: "/payment/cancelled", element: lazyRoute(PaymentCancelledPage)},
            {path: "/auth/callback/:provider", element: lazyRoute(AuthCallbackPage)},
            {path: "/recover-account", element: lazyRoute(RecoverAccountPage)},
            {path: "/recover-account/reset", element: lazyRoute(RecoverAccountResetPage)},
            {path: "/support/guest", element: lazyRoute(GuestSupportPage)},
            {path: "/account/deletion/confirm", element: lazyRoute(DeletionConfirmPage)},

            // — Subject area landing pages (SEO depth) —
            {path: "/subjects/mathematics", element: lazyRoute(SubjectMathPage)},
            {path: "/subjects/science", element: lazyRoute(SubjectSciencePage)},
            {
                path: "/subjects/language-proficiency",
                element: lazyRoute(SubjectLanguagePage),
            },
            {
                path: "/subjects/reading-comprehension",
                element: lazyRoute(SubjectReadingPage),
            },

            // — Blog —
            {path: "/blog", element: lazyRoute(BlogListPage)},
            {path: "/blog/:slug", element: lazyRoute(BlogPostPage)},
            {path: "/help", element: lazyRoute(HelpCenterPage)},
            {path: "/help/category/:category", element: lazyRoute(HelpCategoryPage)},
            {path: "/help/article/:slug", element: lazyRoute(HelpArticlePage)},
            {path: "/help/search", element: lazyRoute(HelpSearchPage)},

            // — Protected routes —
            {
                element: <ProtectedRoute requiredRole="reviewee"/>,
                children: [
                    {path: "/dashboard", element: lazyRoute(DashboardPage)},
                    {path: "/mock-exam", element: lazyRoute(StudyPlanAnalyticsPage)},
                    {path: "/exam/:sessionId", element: lazyRoute(BatchExamPage)},
                    {path: "/results/:sessionId", element: lazyRoute(ResultsPage)},
                    {path: "/review/:sessionId", element: lazyRoute(ReviewPage)},
                    {path: "/stats", element: lazyRoute(StatsPage)},
                    {path: "/profile", element: lazyRoute(ProfilePage)},
                    {path: "/leaderboard", element: lazyRoute(LeaderboardPage)},
                    {path: "/practice", element: lazyRoute(PracticePage)},
                    {path: "/practice-test/configure", element: lazyRoute(PracticePage)},
                    {path: "/practice/stats", element: lazyRoute(PracticeStatsPage)},
                    {path: "/practice/:sessionId", element: lazyRoute(PracticeSessionPage)},
                    {path: "/study-plan", element: lazyRoute(StudyPlanHubPage)},
                    {path: "/study-plan/setup", element: lazyRoute(StudyPlanSetupPage)},
                    {path: "/study-plan/diagnostic/:id", element: lazyRoute(StudyPlanDiagnosticPage)},
                    {path: "/study-plan/session/:sessionId", element: lazyRoute(StudyPlanSessionPage)},
                    {path: "/study-plan/assessment/:id", element: lazyRoute(StudyPlanAssessmentPage)},
                    {path: "/study-plan/calendar", element: lazyRoute(StudyPlanCalendarPage)},
                    {path: "/study-plan/analytics", element: lazyRoute(StudyPlanAnalyticsPage)},
                    {path: "/study-plan/settings", element: lazyRoute(StudyPlanSettingsPage)},
                    {path: "/settings", element: lazyRoute(SettingsPage)},
                    {path: "/settings/payments", element: lazyRoute(AccountPaymentsPage)},
                    {path: "/payment/:planId", element: lazyRoute(PaymentPage)},
                    {path: "/support", element: lazyRoute(SupportTicketsPage)},
                    {
                        path: "/support/:ticketNumber",
                        element: lazyRoute(SupportTicketDetailPage),
                    },
                ],
            },

            // -- 404 fallback ----------------
            {path: "*", element: <RoleAwareNotFound/>},
        ],
    },
]);
