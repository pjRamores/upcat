import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useExamStore } from "@/stores/examStore";
import { useToastStore } from "@/stores/toastStore";
import apiclient from "@/lib/api";
import { gamificationApi } from "@/lib/gamificationApi";
import { practiceApi } from "@/lib/practiceApi";
import { studyPlanApi } from "@/lib/studyPlanApi";
import { API_ROUTES, type GamificationProfile } from "@upcat/shared";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import Modal from "@/components/Modal";

interface SessionSummary {
  _id: string;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string | null;
  completedAt: string | null;
  totalQuestions: number;
  percentage: number | null;
}

interface QuickStats {
  totalExams: number;
  averageScore: number;
  bestScore: number;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const resetExam = useExamStore((s) => s.reset);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [stats, setStats] = useState<QuickStats>({
    totalExams: 0,
    averageScore: 0,
    bestScore: 0,
  });
  const [loadingList, setLoadingList] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [practiceDue, setPracticeDue] = useState<{ dueToday: number; deckSize: number } | null>(null);
  const [studyToday, setStudyToday] = useState<{ title: string; dayNumber: number; planId: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{ message: string; upgradeUrl: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiclient.get(API_ROUTES.EXAM.SESSIONS);
        if (cancelled) return;
        setSessions(data.data.sessions ?? []);
        setStats(data.data.stats ?? { totalExams: 0, averageScore: 0, bestScore: 0 });
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    // Lazy gamification profile load — non-fatal.
    void gamificationApi
      .profile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => undefined);
    // Practice deck snapshot — non-fatal.
    void practiceApi
      .stats()
      .then((s) => {
        if (!cancelled) setPracticeDue({ dueToday: s.dueToday, deckSize: s.totals.cards });
      })
      .catch(() => undefined);
    void studyPlanApi
      .getActivePlan(false)
      .then(async (plan) => {
        if (!plan || cancelled) return;
        const today = await studyPlanApi.getToday(plan._id);
        const session = (today as { session?: { title?: string; dayNumber?: number } }).session;
        if (session?.title) {
          setStudyToday({
            title: session.title,
            dayNumber: Number(session.dayNumber ?? 1),
            planId: plan._id,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = async () => {
    flushSync(() => {
      setStarting(true);
    });
  };

  const active = sessions.find((s) => s.status === "in_progress");
  if (active?._id) {

    .addToast("info", "You already have an in-progress mock exam. Resuming it now.");
    navigate(`/exam/${(active_id)?resume=1}`);
    return;
}

try {
    resetExam();
    const (data) = await apiClient.post(API_ROUTES.EXAM.START, {});
    navigate(`/exam/${(data.data.sessionId)}`);
} catch (e) {
    const responseData = (e as {
        response?: {
            data?: {
                error?: string;
                upgradeUrl?: string;
                featureId?: string;
                sessionId?: string;
            };
        };
    });
    status?: number;
}.response?.data;
const status = (e as { response?: { status?: number } }).response?.status;
const msg = responseData?.error || "Could not start exam";
const upgradeUrl = responseData?.upgradeUrl;

if (status === 409 && responseData?.sessionId) {
    addToast("info", msg);
    navigate(`/exam/${responseData.sessionId}?resume=1`);
    return;
}

if (upgradeUrl && responseData?.featureId === "mock_exam_access") {
    setUpgradePrompt({ message: msg, upgradeUrl });
} else {
    addToast("error", msg);
}
} finally {
    setStarting(false);
};

const hasInProgress = sessions.some((s) => s.status === "in_progress");

return (
    <div className="mx-auto max-w-5xl px-4 py-10" data-tour="dashboard-main">
        <Seo title="Dashboard" description="Your UFCAT Simulator dashboard. Start a new practice exam or review recent sessions." noindex/>
        <div>
            <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.firstName ?? "Student"}!
            </h1>
            <p className="mt-1 text-gray-500">
                Ready to take the next mock exam?
            </p>
            <Link to="/help" data-tour="help-link" className="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline">
                Need help? Open Help Center →
            </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Exams" value={stats.totalExams} />
            <StatCard label="Average Score" value={`${stats.averageScore}%`} />
            <StatCard label="Best Score" value={`${stats.bestScore}%`} />
        </div>

        {profile && (
            <Link to="/profile" data-tour="xp-summary" data-help="me_percentile" className="mt-6 block rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-sm transition hover:from-indigo-100 hover:to-purple-100">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-2xl font-bold text-white shadow-md">
                        {profile.level.level}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                            {profile.level.title}
                        </div>
                        <div className="font-bold text-slate-900">
                            {profile.level.xp.toLocaleString()} XP
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${profile.level.progressPct}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            {profile.level.xpToNextLevel.toLocaleString()} XP to level{"."}
                            {profile.level.level + 1}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl">{profile.streak.current}</div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">day streak</div>
                    </div>
                </div>
            </Link>
        )}
<div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
    Today's Study Session
</div>
<div className="font-bold text-slate-900">Day {studyToday.dayNumber}: {studyToday.title}</div>
<div className="mt-1 text-xs text-slate-600">Continue your personalized curriculum</div>
<div className="text-right text-sm font-semibold text-emerald-700">
    Open Plan →
</div>
</Link>
</div>
<div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-help="me_attempts">
    <h2 className="text-lg font-semibold text-gray-900">Recent Exams</h2>
    {loadingList ? (
        <div className="flex justify-center py-8">
            <Spinner />
        </div>
    ) : sessions.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">
            No exams yet. Start your first one above!
        </p>
    ) : (
        <ul className="mt-4 divide-y divide-gray-100">
            {sessions.map((s) => (
                <SessionRow key={s._id} session={s} />
            ))}
        </ul>
    )}
    <div className="mt-4 text-right">
        <Link to="/stats" data-tour="stats-link" className="text-sm font-medium text-primary-600 hover:underline">
            View all stats →
        </Link>
    </div>
</div>
<Modal isOpen={Boolean(upgradePrompt)} onClose={() => setUpgradePrompt(null)} size="md" title={<span className="text-primary-700">Upgrade to Premium</span>} description="Continue taking mock exams without monthly limits." footer={
    <>
        <button type="button" onClick={() => setUpgradePrompt(null)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Not now
        </button>
        <button type="button" onClick={() => {
            if (!upgradePrompt) return;
            const target = upgradePrompt.upgradeUrl;
            setUpgradePrompt(null);
            navigate(target);
        }} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Upgrade now
        </button>
    </>
}
>
    <div className="space-y-3">
        <p className="text-sm text-slate-700">{upgradePrompt?.message}</p>
        <div className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-800">
            Premium gives you unlimited mock exams plus advanced analytics.
        </div>
    </div>
</Modal>
</div>;
}
function StatCard({label, value}: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>;
}
function SessionRow({session}: { session: SessionSummary }) {
    const date = session.completedAt ?? session.startedAt;
    const formatted = date ? new Date(date).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    }) : "--";
    const target =
        session.status === "completed"
        ? `/results/${session.id}`
: session.status === "in_progress"
: ? '/exam/${session_id}?resume=1'
: '/results/${session_id}';

return (
    <li className="flex items-center justify-between py-3">
        <div>
            <p className="text-sm font-medium text-gray-900">{formatted}</p>
            <p className="text-xs text-gray-500">{session.totalQuestions} questions</p>
        </div>
        <div className="flex items-center gap-3">
            {session.percentage !== null && (
                <span className="text-sm font-semibold text-gray-900">
                    {session.percentage}%
                </span>
            )}
            <StatusBadge status={session.status} />
            <Link to={target} className="text-sm font-medium text-primary-600 hover:underline">
                {session.status === "in_progress" ? "Resume →" : "View →"}
            </Link>
        </div>
    </li>
);

function StatusBadge({ status }: { status: SessionSummary["status"] }) {
    const styles: Record<SessionSummary["status"], string> = {
        completed: "bg-green-100 text-green-700",
        in_progress: "bg-blue-100 text-blue-700",
        abandoned: "bg-gray-200 text-gray-600",
    };
    const label: Record<SessionSummary["status"], string> = {
        completed: "Completed",
        in_progress: "In Progress",
        abandoned: "Abandoned",
    };
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
            {label[status]}
        </span>
    );
}