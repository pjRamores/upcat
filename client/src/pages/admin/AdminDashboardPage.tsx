import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "@/components/admin/StatCard";
import Spinner from "@/components/Spinner";
import { adminApi } from "@/lib/adminApi";
import type { ActivityLogEntry, AdminDashboardSummary } from "@upcat/shared";

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [s, a] = await Promise.all([
          adminApi.dashboardSummary(),
          adminApi.dashboardActivity(50),
        ]);

        if (cancelled) return;

        setSummary(s);
        setActivity(a);
      } catch (e) {
        const msg = (e as { response?: { data?: { error?: string } } }).response
          ?.data?.error;
        setErr(msg ?? "Could not load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (err || !summary) {
    return (
      <p className="rounded-md bg-primary-50 p-4 text-sm text-primary-700">
        {err}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={summary.users.total}
          hint={`${summary.users.active} active`}
          icon={<span>👨</span>}
          accent="violet"
        />
        <StatCard
          label="Verified"
          value={summary.users.verified}
          hint={`${summary.users.unverified} pending`}
          icon={<span>✅</span>}
          accent="emerald"
        />
        <StatCard
          label="Today"
          value={summary.users.newToday}
          hint={`${summary.users.newThisWeek} this week`}
          icon={<span>📅</span>}
          accent="indigo"
        />
        <StatCard
          label="This Month"
          value={summary.users.newThisMonth}
          hint="new sign-ups"
          icon={<span>📈</span>}
          accent="amber"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Questions"
          value={summary.questions.total}
          hint={`${summary.questions.flagged} flagged`}
          icon={<span>❓</span>}
          accent="violet"
        />
        <StatCard
          label="Passages"
          value={summary.platform.totalPassages}
          icon={<span>📜</span>}
          accent="indigo"
        />
        <StatCard
          label="Recently Added"
          value={summary.questions.recentlyAdded}
          hint="last 7 days"
          icon={<span>📅</span>}
          accent="emerald"
        />
        <StatCard
          label="Open Contact Msgs"
          value={summary.platform.openContactMessages}
          icon={<span>✉️</span>}
          accent="rose"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Exams"
          value={summary.exams.totalSessions}
          hint={`${summary.exams.activeRightNow} in progress`}
          icon={<span>📝</span>}
          accent="violet"
        />
        <StatCard
          label="Today"
          value={summary.exams.completedToday}
          hint={`${summary.exams.completedThisWeek} this week`}
          icon={<span>📅</span>}
          accent="indigo"
        />
        <StatCard
          label="Avg Score"
          value={`${summary.exams.averageScore.toFixed(1)}%`}
          icon={<span>📊</span>}
          accent="emerald"
        />
        <StatCard
          label="Completion"
          value={`${summary.exams.averageCompletionRate.toFixed(1)}%`}
          icon={<span>✅</span>}
          accent="amber"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-700">
            Questions by Subject
          </h2>
          <ul className="space-y-2">
            {Object.entries(summary.questions.bySubject ?? {}).map(([k, v]) => (
              <BarRow
                key={k}
                label={k}
                value={v as number}
                max={Math.max(
                  ...Object.values(summary.questions.bySubject ?? {}).map(
                    (x) => x as number
                  ),
                  1
                )}
              />
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-700">
            Questions by Difficulty
          </h2>
          <ul className="space-y-2">
            {Object.entries(summary.questions.byDifficulty ?? {}).map(
              ([k, v]) => (
                <BarRow
                  key={k}
                  label={k}
                  value={v as number}
                  max={Math.max(
                    ...Object.values(summary.questions.byDifficulty ?? {}).map(
                      (x) => x as number
                    ),
                    1
                  )}
                />
              )
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Recent Activity</h2>
          <Link
            to="/admin/audit-log"
            className="text-xs font-medium text-primary-700 hover:underline"
          >
            View full log →
          </Link>
        </div>

        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {activity.slice(0, 25).map((a) => (
              <li
                key={a._id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">
                    {a.action}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-slate-500">
                  {a.actorRole === "admin" ? "👑" : "👤"} {a.actorId}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <li>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
