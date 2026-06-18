/**
 * Phase 13 -- Practice deck statistics page.
 *
 * Shows: status totals (new/learning/review/mastered), retention %, due today
 * / due this week, subject breakdown table, 7-day upcoming forecast, and a paginated cards browser with filters.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  type PracticeCardListEntry,
  type PracticeCardStatus,
  type PracticeStatsResponse,
} from "@upcat/shared";
import { PRACTICE_MODE_LABELS, practiceApi } from "@/lib/practiceApi";
import { useToastStore } from "@/stores/toastStore";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

const STATUS_OPTIONS: Array<{ value: PracticeCardStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "review", label: "Review" },
  { value: "mastered", label: "Mastered" },
];

const STATUS_BADGE: Record<PracticeCardStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  learning: "bg-amber-100 text-amber-800",
  review: "bg-indigo-100 text-indigo-800",
  mastered: "bg-emerald-100 text-emerald-800",
};

export default function PracticeStatsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [stats, setStats] = useState<PracticeStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<PracticeCardListEntry[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PracticeCardStatus | "">("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const s = await practiceApi.stats();
        if (!cancelled) setStats(s);
      } catch {
        addToast("error", "Failed to load practice stats.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  useEffect(() => {
    let cancelled = false;
    setCardsLoading(true);

    (async () => {
      try {
        const res = await practiceApi.cards({
          page,
          limit: 20,
          status: statusFilter || undefined,
          search: search.trim() || undefined,
        });

        if (!cancelled) {
          setCards(res.cards);
          setTotalPages(res.totalPages);
        }
      } catch {
        if (!cancelled) addToast("error", "Failed to load cards.");
      } finally {
        if (!cancelled) setCardsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, search, addToast]);

  if (loading || !stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const maxUpcoming = Math.max(1, ...stats.upcoming.map((u) => u.count));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Seo title="Practice Stats · UPCAT Simulator" noindex />

      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Practice Deck Stats</h1>
          <p className="mt-1 text-sm text-slate-600">
            A snapshot of your spaced-repetition deck health.
          </p>
        </div>

        <Link
          to="/practice"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Start practice →
        </Link>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Tile label="Deck" value={stats.totals.cards} />
        <Tile label="New" value={stats.totals.new} />
        <Tile label="Learning" value={stats.totals.learning} />
        <Tile label="Review" value={stats.totals.review} />
        <Tile label="Mastered" value={stats.totals.mastered} accent="text-emerald-700" />
        <Tile label="Retention" value={`${stats.retentionPct.toFixed(1)}%`} accent="text-sky-700" />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Due today
          </div>
          <div className="mt-1 text-3xl font-bold text-amber-700">{stats.dueToday}</div>
          <p className="mt-1 text-xs text-slate-500">
            Plus {stats.dueThisWeek - stats.dueToday} more this week.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total reviews logged
          </div>
          <div className="mt-1 text-3xl font-bold text-primary-700">{stats.totalReviews}</div>
          <p className="mt-1 text-xs text-slate-500">Across all completed sessions.</p>
        </div>
      </section>

      {stats.upcoming.length > 0 && (
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming reviews (7 days)</h2>
          <div className="mt-4 space-y-2">
            {stats.upcoming.map((u) => (
              <div key={u.date} className="flex items-center gap-3">
                <div className="w-24 text-xs text-slate-600">{u.date}</div>
                <div className="flex h-5 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full bg-primary-500"
                    style={{ width: `${(u.count / maxUpcoming) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs font-semibold text-slate-700">
                  {u.count}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats.bySubject.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">By subject</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Cards</th>
                  <th className="px-4 py-2">Mastered</th>
                  <th className="px-4 py-2">Due today</th>
                  <th className="px-4 py-2">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.bySubject.map((s) => (
                  <tr key={s.subjectArea}>
                    <td className="px-4 py-2 font-medium text-slate-900">{s.subjectArea}</td>
                    <td className="px-4 py-2 text-slate-700">{s.cards}</td>
                    <td className="px-4 py-2 text-emerald-700">{s.mastered}</td>
                    <td className="px-4 py-2 text-amber-700">{s.dueToday}</td>
                    <td className="px-4 py-2 text-slate-900">{s.accuracyPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stats.recentSessions.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent sessions</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Cards</th>
                  <th className="px-4 py-2">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentSessions.map((s) => (
                  <tr key={s.sessionId}>
                    <td className="px-4 py-2 text-slate-700">
                      {new Date(s.completedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{PRACTICE_MODE_LABELS[s.mode]}</td>
                    <td className="px-4 py-2 text-slate-700">{s.totalAnswered}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {s.accuracyPct.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Browse cards</h2>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as PracticeCardStatus | "");
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search question text..."
            className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {cardsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : cards.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No cards match these filters.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Preview</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Interval</th>
                  <th className="px-4 py-2">Next review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cards.map((c) => (
                  <tr key={c.cardId}>
                    <td className="px-4 py-2 text-slate-700">
                      {c.questionPreview || (
                        <span className="italic text-slate-400">(no preview)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.subjectArea}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.intervalDays}d</td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(c.nextReviewDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
            >
              ← Prev
            </button>

            <span className="text-slate-600">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}
