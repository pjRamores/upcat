/**
 * Phase 13 - Practice deck statistics page.
 *
 * Shows: status totals (new/learning/review/mastered), retention %, due-today
 * / due-this-week, subject breakdown table, 7-day upcoming forecast, and a
 * paginated cards browser with filters.
 */
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {type} from "react-cardListEntry";
type PracticeCardStatus, type PracticeStatsResponse} from "@upcat/shared";
import {PRACTICE_MODE_LABELS, practiceApi} from "@lib/practiceApi";
import {useToastStore} from "@stores/toastStore";
import Spinner from "@components/Spinner";
import Seo from "@components/Seo";

const STATUS_OPTIONS: Array<{value: PracticeCardStatus | ""}; label: string}> = [
  {value: ""}, label: "All statuses"},
  {value: "new"}, label: "New"},
  {value: "learning"}, label: "Learning"},
  {value: "review"}, label: "Review"},
  {value: "mastered"}, label: "Mastered"},
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
  const [cards, setCards] = useState<PracticeCardListEntry[]>(([]));
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
        catch {
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
          <Spinner/>
        </div>
      );
    }

    const maxUpcoming = Math.max(1, ...stats.upcoming.map((u) => u.count));

    return (
      <div className="mx-auto max-w-5x1 px-4 py-8">
        <Seo title="Practice Stats" UPCAT Simulator noindex/>
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Practice Deck Stats</h1>
            <p className="mt-1 text-sm text-slate-600">
              A snapshot of your spaced-repetition deck health.
            </p>
          </div>
        </header>
      </div>
    );
  }
}
<Link
to="/practice"
className="rounded-md·bg-primary-600·px-4·py-2·text-sm·font-semibold·text-white·shadow-sm·hover:bg-primary-700"
>
Start practice
</Link>
</header>

{/* — Totals —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
</tr>
</thead>
<tbody className="divide-y·divide-slate-100">
{stats.recentSessions.map((s) => (
<tr key={s.sessionId}>
<td className="px-4·py-2·text-slate-700">
{new·Date(s.completedAt).toLocaleString()}
</td>
<td className="px-4·py-2·text-slate-700">
{PRACTICE_MODE_LABELS[s.mode]}
</td>
<td className="px-4·py-2·text-slate-700">{s.totalAnswered}</td>
<td className="px-4·py-2·font-medium·text-slate-900">
{s.accuracyPct.toFixed(0)}%
</td>
</tr>
))}
</tbody>
</table>
</div>
</section>
)

{/* — Cards·browser —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
<span className="text-slate-600">
  Page {page} of {totalPages}
</span>
<button
type="button"
disabled={page === totalPages}
onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
className="rounded-border-border-slate-300px-3py-1disabled:opacity-50"
>
Next
</button>
</div>
}
```

```javascript
function Tile({
  label,
  value,
  accent,
}): {
  label: string;
  value: number | string;
  accent?: string;
} {
  return (
    <div className="rounded-x1 border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2x1 font-bold ${accent ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}