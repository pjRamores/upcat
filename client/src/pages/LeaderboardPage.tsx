/**
 * Phase 12 — Global leaderboard page.
 */
import {useCallback, useEffect, useState} from "react";
import {
  LEADERBOARD_SCOPES,
  type, LeaderboardEntry,
  type, LeaderboardResponse,
  type, LeaderboardScope,
} from "@upcat/shared";
import {gamificationApi} from "@/lib/gamificationApi";
import {useToastStore} from "@/stores/toastStore";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

const SCOPE_LABEL: Record<LeaderboardScope, string> = {
  weekly: "This Week",
  monthly: "This Month",
  all_time: "All Time",
};

export default function LeaderboardPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [scope, setScope] = useState<LeaderboardScope>("weekly");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  const load = useCallback(
    async (s: LeaderboardScope) => {
      setLoading(true);
      try {
        const res = await gamificationApi.leaderboard(s);
        setData(res);
      } catch {
        addToast("error", "Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    void load(scope);
  }, [load, scope]);

  return (
    <div className="mx-auto max-w-3x1 px-4 py-8">
      <Seo
        title="Leaderboard | UPCAT Simulator — Top UPCAT Reviewers"
        description="See who's leading the pack. Compare your scores with thousands of UPCAT reviewees and climb the rankings."
        bare
      />
      <header className="mb-6">
        <h1 className="text-3x1 font-bold text-slate-900">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          See how you stack up against other reviewees.
        </p>
      </header>

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {LEADERBOARD_SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${s}`
              scope === s
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:bg-slate-50"
            )}
          )
        )}
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner/>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {data.entries.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No entries yet — be the first to earn XP this period!
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">Reviewee</th>
                    <th className="px-4 py-2 text-right">Level</th>
                    <th className="px-4 py-2 text-right">XP</th>
                    <th className="px-4 py-2 text-right">◎</th>
                  </tr>
                </thead>
                <tbody>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.entries.map((e) => (
                      <LeaderboardRow key={e.userId} entry={e} />
                    ))}
                  </tbody>
                </tbody>
              </table>
        </div>
      </td>
    </tr>
  </thead>
  <tbody>
    <tbody className="divide-y divide-slate-100 text-sm">
      {data.entries.map((e) => (
        <LeaderboardRow key={e.userId} entry={e} />
      ))}
    </tbody>
  </table>
{data.currentUser &&
!data.entries.some((e) => e.isCurrentUser) &&
<div className="mt-4·rounded-xl·border·border-indigo-200·bg-indigo-50·p-4">
<div className="text-xs·font-semibold·uppercase·tracking-wide·text-indigo-700">
Your position
</div>
<div className="mt-2·grid·grid-cols-5·items-center·text-sm">
<span className="font-mono·font-bold·text-indigo-900">
#{data.currentUser.rank}
</span>
<span className="col-span-2·text-slate-700">
{data.currentUser.displayName}
</span>
<span className="text-right·font-medium·text-slate-700">
Lv {data.currentUser.level}
</span>
<span className="text-right·font-mono·text-indigo-700">
{data.currentUser.xp.toLocaleString()}
</span>
</div>
</div>
}

<p className="mt-4·text-center·text-xs·text-slate-400">
Updated {new Date(data.generatedAt).toLocaleString()}
</p>
</>
}
</div>
}
);
}

function LeaderboardRow({entry}: {entry: LeaderboardEntry}) {
const medal =
entry.rank === 1 ? "❤" : entry.rank === 2 ? "❤" : entry.rank === 3 ? "❤" : null;
return (
<tr>
<className={
entry.isCurrentUser ? "bg-indigo-50·font-semibold" : "hover:bg-slate-50"
}
>
<td className="px-4·py-3·font-mono">
{medal ? <span className="text-lg">{medal}</span> : `${entry.rank}`}
</td>
<td className="px-4·py-3">
<div className="flex·items-center·gap-2">
<div className="flex·h-8·w-8·items-center·justify-center·rounded-full·bg-indigo-100·text-xs·font-bold·text-indigo-700">
{entry.avatarInitials}
</div>
<div>
<div className="text-slate-900">{entry.displayName}</div>
<div className="text-[11px]·text-slate-500">{entry.title}</div>
</div>
</div>
</td>
<td className="px-4·py-3·text-right">{entry.level}</td>
<td className="px-4·py-3·text-right·font-mono·text-indigo-700">
{entry.xp.toLocaleString()}
</td>
<td className="px-4·py-3·text-right">{entry.streak}</td>
</tr>
);
}