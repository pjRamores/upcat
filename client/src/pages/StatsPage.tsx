import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import apiClient from "@/lib/api";
import { studyPlanApi } from "@/lib/studyPlanApi";
import { useAuthStore } from "@/stores/authStore";
import Seo from "@/components/Seo";
import { API_ROUTES, type Difficulty, DIFFICULTY_LABELS, SUBJECT_META, type SubjectArea } from "@upcat/shared";

// --- Types ---
interface OverviewData {
  totalExamsTaken: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  totalTimeSpent: { formatted: string; hours: number; minutes: number };
  currentStreak: number;
  longestStreak: number;
}

interface SubjectStat {
  subjectArea: SubjectArea;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  averageTimePerQuestion: number;
  trend: { sessionId: string; date: string; accuracy: number }[];
}

interface DifficultyStat {
  difficulty: Difficulty;
  totalQuestions: number;
  correct: number;
  accuracy: number;
}

interface ProgressPoint {
  date: string;
  examsTaken: number;
  averageScore: number;
  accuracy: number
}

interface WeakArea {
  subtopic: string;
  subjectArea: SubjectArea;
  accuracy: number;
  totalAttempted: number;
  correct: number;
  suggestion: string;
}

interface LeaderboardRow {
  rank: number;
  firstName: string;
  lastInitial: string;
  averageScore: number;
  examsCompleted: number;
  isMe: boolean;
}

interface StudyPlanSnapshot {
  planId: string;
  progressPercent: number;
  completedDays: number;
  totalDays: number;
  daysAhead: number;
  averageAssessmentScore: number;
}

type Period = "week" | "month" | "all";

// --- Color palette (consistent across charts) ---
const PALETTE = {
  primary: "#8b2049", // maroon-700
  good: "#16a34a",
  okay: "#ca8a04",
  bad: "#dc2626",
  difficulty: {
    easy: "#16a34a",
    medium: "#ca8a04",
    hard: "#ea580c",
    very_hard: "#dc2626"
  } as Record<Difficulty, string>,
"Language Proficiency":"#a62e5a",
Mathematics:"#0ea5e9",
Science:"#16a34a",
"Reading Comprehension":"#f59e0b",
} as Record<SubjectArea, string>,
};

const colorForAccuracy = (pct: number) =>
  pct >= .80 ? PALETTE.good : pct >= .60 ? PALETTE.okay : PALETTE.bad;

export default function StatsPage() {
  const me = useAuthStore((s) => s.user);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [subjects, setSubjects] = useState<SubjectStat[] | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyStat[] | null>(null);
  const [weak, setWeak] = useState<WeakArea[] | null>(null);

  const [progressPeriod, setProgressPeriod] = useState<Period>("week");
  const [progress, setProgress] = useState<ProgressPoint[] | null>(null);

  const [leaderboardPeriod, setLeaderboardPeriod] = useState<Period>("week");
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [myRank, setMyRank] = useState<LeaderboardRow | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlanSnapshot | null>(null);

  // Initial loads (parallel)
  useEffect(() => {
    apiClient.get(API_ROUTES.STATS.OVERVIEW)
      .then((r) => setOverview(r.data.data))
      .catch(() => setOverview(emptyOverview()));
    apiClient.get(API_ROUTES.STATS.SUBJECT_BREAKDOWN)
      .then((r) => setSubjects(r.data.data))
      .catch(() => setSubjects([]));
    apiClient.get(API_ROUTES.STATS.DIFFICULTY_BREAKDOWN)
      .then((r) => setDifficulty(r.data.data))
      .catch(() => setDifficulty([]));
    apiClient.get(API_ROUTES.STATS.WEAK_AREAS)
      .then((r) => setWeak(r.data.data))
      .catch(() => setWeak([]));
  void studyPlanApi
    .getActivePlan(false)
    .then((plan) => {
      if (!plan) {
        setStudyPlan(null);
        return;
      }
      setStudyPlan({
        planId: plan.id,
        progressPercent: plan.progress.overallProgress,
        completedDays: plan.progress.completedDays,
        totalDays: plan.progress.totalDays,
        daysAhead: plan.schedule.daysAhead,
        averageAssessmentScore: plan.progress.averageAssessmentScore,
      });
    })
  .catch(() => setStudyPlan(null));
}, []);

useEffect(() => {
  setProgress(null);
  apiClient.get(`${API_ROUTES.STATS.PROGRESS}?period=${progressPeriod}`)
    .then((r) => setProgress(r.data.data.points))
    .catch(() => setProgress([]));
}, [progressPeriod]);

useEffect(() => {
  setLeaderboard(null);
  apiClient.get(`${API_ROUTES.STATS.LEADERBOARD}?period=${leaderboardPeriod}`)
    .then((r) => {
      setLeaderboard(r.data.data.leaderboard);
      setMyRank(r.data.data.me ?? null);
    })
    .catch(() => setLeaderboard([]));
}, [leaderboardPeriod]);

return (
  <div className="mx-auto max-w-7xl px-4 py-10">
    <Seo title="My Statistics" description="Track your UPCAT preparation progress and identify weak areas." noindex />
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Statistics</h1>
        <p className="mt-1 text-gray-500">Track your UPCAT preparation progress.</p>
      </div>
      <Link to="/dashboard" className="text-sm font-medium text-primary-600 hover:underline">
        Dashboard
      </Link>
    </div>

    {/* Overview cards */}
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      data-help="st_practice_vs_mock">
      {overview ? (
        <>
          <OverviewCard icon={faExclamationTriangle} label="Exams Taken" value={overview.totalExamsTaken} />
          <OverviewCardCircle label="Avg. Score" percentage={overview.averageScore} />
          <OverviewCard icon={faStar} label="Best Score" value={`${overview.highestScore}`} accent="amber" />
          <OverviewCard icon={faClock} label="Study Time" value={overview.totalTimeSpent.formatted} />
          <OverviewCard icon={faAngleUp} label="Streak" value={`${overview.currentStreak}`} sub={`Best ${overview.longestStreak}`} accent="orange" />
          <OverviewCard icon={faCircle} label="Accuracy" value={`${overview.overallAccuracy}%`}
            sub={`${overview.totalQuestionsAnswered} answered`}/>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center h-full">
            <Icon name="exclamation-triangle" size={24} color="#f59e0b" />
            <p className="mt-3 text-sm font-medium text-gray-600">No data available.</p>
          </div>
        </>
      )}
    </section>
  </div>
);
Array.from({length: 6}).map(({_, i}) => <SkeletonCard key={i}/>)
</section>

{studyPlan && (
    <section className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Study Plan</p>
                <h2 className="text-xl font-bold text-slate-900">{studyPlan.progressPercent}% complete</h2>
                <p className="mt-1 text-sm text-slate-600">
                    {studyPlan.completedDays} of {studyPlan.totalDays} study days finished. Avg assessment: {studyPlan.averageAssessmentScore}%
                </p>
            </div>
            <div className="text-right">
                <div className={`text-sm font-semibold ${studyPlan.daysAhead >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                    {studyPlan.daysAhead >= 0 ? `${studyPlan.daysAhead} day(s) ahead` : `${Math.abs(studyPlan.daysAhead)} day(s) behind`}
                </div>
                <Link to="/study-plan/analytics" className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:underline">
                    View study plan analytics →
                </Link>
            </div>
        </div>
    </section>
)}

{/* ── Two-column main area ─────────────── */}
<section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
    {/* Left: charts (span 2) ├─── */}
    <div className="space-y-6 lg:col-span-2">
        {/* Performance over time */}
        <Panel title="Performance Over Time">
            <div className="mb-3 flex flex-wrap gap-1">
                {(["week", "month", "all"] as Period[]).map((p) => (
                    <PeriodPill key={p} active={progressPeriod === p} onClick={() => setProgressPeriod(p)}>
                        {p === "week" ? "Last 7 days" : p === "month" ? "Last 30 days" : "All time"}
                    </PeriodPill>
                ))}
            </div>
            <div className="h-64 animate-fade-in">
                {progress === null ? (
                    <SkeletonChart/>
                ) : progress.length === 0 ? (
                    <EmptyState message="Take your first exam to see your progress."/>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progress} margin={{top: 10, right: 16, left: -8, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                            <XAxis dataKey="date" tick={{fontSize: 11}} stroke="#9ca3af"/>
                            <YAxis domain={[0, 100]} tick={{fontSize: 11}} stroke="#9ca3af" unit="%"/>
                            <Tooltip contentStyle={{borderRadius: .8, border: "1px solid #e5e7eb", fontSize: 12}}
                                     formatter={(v: number, name: string) => [`${v}%`, name]}/>
                            <Legend wrapperStyle={{fontSize: 12}}/>
                            <Line type="monotone" dataKey="averageScore" name="Avg. Score"
                                  stroke={PALETTE.primary} strokeWidth={2.5}
                                  dot={(r: .4)} activeDot={(r: .6)} animationDuration={800}/>
                            <Line type="monotone" dataKey="accuracy" name="Accuracy"
                                  stroke={PALETTE.good} strokeWidth={2}
                                  dot={(r: .3)} animationDuration={800}/>
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </Panel>

        {/* Subject breakdown */}
        <Panel title="Subject Breakdown">
            {subjects === null ? (
                <SkeletonChart/>
            ) : subjects.every((s) => s.totalQuestions === 0) ? (
                <EmptyState message="No subject data yet."/>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Bars */}
                    <div className="space-y-3">
                        {subjects.map((s) => (
                            <SubjectBar key={s.subjectArea} stat={s}/>
                        ))}
                    </div>
                </div>
            )}
        </Panel>

        {/* Radar */}
<div className="h-64 min-h-56">
  <ResponsiveContainer width="100%" height="100%">
    <RadarChart data={subjects.map((s) => ({
      subject: SUBJECT_META[s.subjectArea].label.split(" ")[0],
      accuracy: s.accuracy,
    }))}>
      <PolarGrid stroke="#e5e7eb"/>
      <PolarAngleAxis dataKey="subject" tick={{fontSize: 11}}/>
      <PolarRadiusAxis domain={[0, 100]} tick={{fontSize: 10}} stroke="#9ca3af"/>
      <Radar
        dataKey="accuracy"
        stroke={PALETTE.primary}
        fill={PALETTE.primary}
        fillOpacity={0.3}
        animationDuration={800}
      />
      <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{borderRadius: 8, fontSize: 12}}/>
    </RadarChart>
  </ResponsiveContainer>
</div>

{/* Difficulty */}
<Panel title="Difficulty Analysis">
  {difficulty === null ? (
    <SkeletonChart/>
  ) : difficulty.every((d) => d.totalQuestions === 0) ? (
    <EmptyState message="No data yet."/>
  ) : (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={difficulty}
              dataKey="totalQuestions"
              nameKey="difficulty"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              animationDuration={800}
              label={(e: { difficulty: Difficulty; totalQuestions: number }) => `${DIFFICULTY_LABELS[e.difficulty]}: ${e.totalQuestions}`}
            >
              <Cell key={d.difficulty} fill={PALETTE.difficulty[d.difficulty]}/>
            </Pie>
            <Tooltip contentStyle={{borderRadius: 8, fontSize: 12}}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3 self-center">
        {difficulty.map((d) => (
          <div key={d.difficulty}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-800">{DIFFICULTY_LABELS[d.difficulty]}</span>
              <span className="text-gray-600">{(d.correct) / (d.totalQuestions)} · <strong>{d.accuracy}%</strong></span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full transition-all" style={{width: `${d.accuracy}%`, backgroundColor: PALETTE.difficulty[d.difficulty]}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</Panel>
</div>

{/* Right: panels */}
<div className="space-y-6">
  {/* Weak areas */}
  <Panel title="Weak Areas">
    {weak === null ? (
      <SkeletonList/>
    ) : weak.length === 0 ? (
      <EmptyState compact message="No weak areas detected. Keep going!"/>
    ) : (
      <ul className="space-y-3" data-help="st_weak_areas">
        {weak.map((w) => (
          <WeakAreaItem key={`${w.subjectArea}-${w.subtopic}`} weak={w}/>
        ))}
      </ul>
    )}
  </Panel>

  {/* Leaderboard */}
  <Panel title="Leaderboard">
    <div data-help="st_predicted_score"/>
    <div className="mb-3 flex flex-wrap gap-1">
function PeriodPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {children}
        </button>
    );
}

function OverviewCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string | number; sub?: string; accent?: "amber" | "orange"; }) {
    const accentClass = accent === "amber" ? "text-amber-600" : accent === "orange" ? "text-orange-600" : "text-gray-900";
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-1.5">
                <span aria-hidden>{icon}</span>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
            </div>
            <p className={`mt-1 text-2xl font-bold ${accentClass}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

function OverviewCardCircle({ label, percentage }: { label: string; percentage: number }) {
    const size = 56;
    const stroke = .6;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (percentage / 100) * c;
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <div className="mt-1 flex items-center gap-3">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="rotate-90">
                        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none"/>
                        <circle
                            cx={(size / 2) + offset}
                            cy={(size / 2) - (offset)}
                            r={r}
                            stroke={colorForAccuracy(percentage)} strokeWidth={stroke} fill="none"
                            strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset .1s ease-out" }}
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}
function SubjectBar({ stat }: { stat: SubjectStat }) {
  const meta = SUBJECT_META[stat.subjectArea];
  const color = colorForAccuracy(stat.accuracy);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-800">{meta.icon} {meta.label}</span>
        <span className="text-gray-600">{stat.correct}/{stat.totalQuestions} • <strong>{stat.accuracy}%</strong></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${stat.accuracy}%`, backgroundColor: color }}
        />
      </div>
      {stat.trend.length > 0 && (
        <p className="mt-1 text-[11px] text-gray-400">
          Last {stat.trend.length}: {stat.trend.map((t) => `${t.accuracy}%`).join(" → ")}
        </p>
      )}
    </div>
  );
}

function WeakAreaItem({ weak }: { weak: WeakArea }) {
  const navigate = useNavigate();
  const meta = SUBJECT_META[weak.subjectArea];
  return (
    <li className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{weak.subtopic}</p>
          <p className="text-[11px] text-gray-500">{meta.icon} {meta.label} • {weak.correct}/{weak.totalAttempted}. correct</p>
        </div>
        <span className="text-sm font-bold text-amber-600">{weak.accuracy}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${weak.accuracy}%` }}
        />
      </div>
      <button type="button" onClick={() => navigate("/dashboard")} className="mt-2 text-xs font-semibold text-primary-600 hover:underline">
        Practice This Topic →
      </button>
    </li>
  );
}

function LeaderboardTable({
  rows,
  me,
  myEmail,
}: {
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
  myEmail?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="w-10 px-3 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Name</th>
            <th className="px-2 py-2 text-right">Avg</th>
            <th className="px-2 py-2 text-right">Exams</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <LeaderboardRowItem key={`${r.rank}-${r.firstName}-${r.lastInitial}`} row={r} />
          ))}
          {me && (
            <>
              <tr>
                <td colSpan={4}
                    className="border-t border-dashed border-gray-200 py-1 text-center text-[11px] text-gray-400">
                  ...
                </td>
              </tr>
              <LeaderboardRowItem row={me} />
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardRowItem({ row }: { row: LeaderboardRow }) {
const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : "";
return (
    <tr className={row.isMe ? "bg-primary-50 font-semibold" : ""}>
        <td className="px-3 py-2 text-gray-600">{medal || row.rank}</td>
        <td className="px-2 py-2">{row.firstName} {row.lastInitial}
            {row.isMe && <span className="ml-1 text-xs text-primary-600">(you)</span>}
        </td>
        <td className="px-2 py-2 text-right text-gray-900">{row.averageScore}%</td>
        <td className="px-2 py-2 text-right text-gray-500">{row.examsCompleted}</td>
    </tr>
);

function RecentActivity() {
    const [items, setItems] = useState<{
        id: string;
        status: string;
        startedAt: string | null;
        completedAt: string | null;
        totalQuestions: number;
        percentage: number | null
    }[] | null>(null);

    useEffect(() => {
        apiClient.get(`${API_ROUTES.EXAM_SESSIONS}?limit=10`)
            .then((r) => setItems(r.data.data.sessions ?? []))
            .catch(() => setItems([]));
    }, []);

    return (
        <Panel title="Recent Activity">
            {items === null ? (
                <SkeletonList />
            ) : items.length === 0 ? (
                <EmptyState message="No exams yet." />
            ) : (
                <ol className="relative ml-3 space-y-4 border-l-2 border-gray-100 pl-4">
                    {items.map((it) => {
                        const date = it.completedAt ?? it.startedAt;
                        const formatted = date ? new Date(date).toLocaleString() : "-";
                        const pct = it.percentage;
                        return (
                            <li key={it._id} className="relative">
                                <span
                                    className="absolute -left-[1.45rem] top-1.5 inline-block h-3 w-3 rounded-full border-2 border-white"
                                    style={{
                                        backgroundColor: pct === null ? "#9ca3af" : colorForAccuracy(pct),
                                    }}
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white p-3">
                                    <p className="text-sm font-medium text-gray-900">{formatted}</p>
                                    <p className="text-xs text-gray-500">{it.totalQuestions} questions • {it.status.replace("_", " ")}</p>
                                </div>
                                {pct !== null && (
                                    <span
                                        className="rounded-full px-3 py-1 text-xs font-bold"
                                        style={{
                                            backgroundColor: `${colorForAccuracy(pct)}20`,
                                            color: colorForAccuracy(pct),
                                        }}
                                    >
                                        {pct}%
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </Panel>
    );
}

// --- Skeleton & empty states -------------------

function SkeletonCard() {
    return (
        <div className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
    );
}

function SkeletonChart() {
    return <div className="h-64 animate-pulse rounded-lg bg-gray-50" />;
}

function SkeletonList() {
    return (
        <div className="space-y-2">
            {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50" />
            ))}
        </div>
    );
}

function EmptyState({message, compact}: { message: string; compact?: boolean }) {
    return (
function emptyOverview(): OverviewData {
    return {
        totalExamsTaken: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        totalQuestionsAnswered: 0,
        overallAccuracy: 0,
        totalTimeSpent: { formatted: "0h 0m", hours: 0, minutes: 0 },
        currentStreak: 0,
        longestStreak: 0
    };
}