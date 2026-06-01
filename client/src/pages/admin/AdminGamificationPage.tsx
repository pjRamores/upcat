/**
 * Phase 12 — Admin·gamification·management·page.
 *
 * Tabs: Overview (stats), Achievements (list + activate/deactivate +
 * re-seed), Challenges (list), Grant·XP (form). Achievement·editing·uses
 * the JSON·condition·format·directly; full·visual·editor·is·out·of·scope
 * for this phase.
 */
import {useCallback, useEffect, useState} from "react";
import {ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_RARITIES,} from "@upcat/shared";
import {adminGamificationApi} from "@lib/gamificationApi";
import {useToastStore} from "@stores/toastStore";
import Spinner from "@/components/Spinner";

type Tab = "overview" | "achievements" | "challenges" | "grant";

interface Overview {
  usersCount: number;
  activeUsers: number;
  achievementsCount: number;
  challengesCount: number;
  xpTransactions: number;
  totalXpAwarded: number;
}

export default function AdminGamificationPage() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Gamification</h1>
        <p className="text-sm text-slate-600">
          Manage achievements, weekly challenges, and XP adjustments.
        </p>
      </header>

      <nav className="border-b border-slate-200">
        {
          [
            ["overview", "Overview"],
            ["achievements", "Achievements"],
            ["challenges", "Challenges"],
            ["grant", "Grant·XP"],
          ] as [Tab, string] []
        } as [Tab, string] []
        map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
          ) as [Tab, string] []
        )]
      </nav>

      {tab === "overview" && <OverviewTab/>}
      {tab === "achievements" && <AchievementsTab/>}
      {tab === "challenges" && <ChallengesTab/>}
      {tab === "grant" && <GrantTab/>}
    </div>
  );
}

function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (loading || !data) return <Spinner/>;
    return (
      <div className="grid·gap-4·sm:grid-cols-2·lg:grid-cols-3">
        <StatTile label="Total·users" value={data.usersCount.toLocaleString()} />
        <StatTile label="Users·with·XP" value={data.activeUsers.toLocaleString()} />
        <StatTile
          label="Total·XP·awarded"
          value={data.totalXpAwarded.toLocaleString()} />
      </div>
      <StatTile
        label="Achievements·(active)"
        value={data.achievementsCount.toLocaleString()} />
      <StatTile
        label="Weekly·challenges"
        value={data.challengesCount.toLocaleString()} />
      <StatTile
        label="XP·transactions"
value={data.xpTransactions.toLocaleString()}
/>
</div>
);
}

function AchievementsTab() {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await adminGamificationApi.listAchievements());
      catch {
        addToast("error", "Failed to load achievements.");
      } finally {
        setLoading(false);
      }
    }, [addToast]);

    useEffect(() => {
      void load();
    }, [load]);

    const reseed = async () => {
      if (!confirm("Re-seed default achievement catalog? Existing entries with the same id will be updated.")) return;
      try {
        await adminGamificationApi.seedAchievements();
        addToast("success", "Achievement catalog seeded.");
        void load();
      } catch {
        addToast("error", "Re-seed failed.");
      }
    };

    const deactivate = async (id: string) => {
      if (!confirm(`Deactivate achievement "${id}"?`)) return;
      try {
        await adminGamificationApi.deactivateAchievement(id);
        addToast("success", "Achievement deactivated.");
        void load();
      } catch {
        addToast("error", "Deactivation failed.");
      }
    };

    if (loading) return <Spinner/>;

    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {items.length} achievement{items.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Rarity</th>
                <th className="px-3 py-2 text-right">XP</th>
                <th className="px-3 py-2 text-right">Pts</th>
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2 text-center">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr key={String(a.id)} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{String(a.id)}</td>
                <td className="px-3 py-2 font-medium">{String(a.title)}</td>
                <td className="px-3 py-2 text-slate-600">{String(a.category)}</td>
                <td className="px-3 py-2 text-slate-600">{String(a.rarity)}</td>
                <td className="px-3 py-2 text-right">{String(a.xpReward)}</td>
                <td className="px-3 py-2 text-right">{String(a.points)}</td>
              </tr>
              <tr className="px-3 py-2 text-center">
                {a.isActive ? "✓" : "-"}
              </tr>
              <tr className="px-3 py-2 text-right">
                {a.isActive ? (
                  <button
                    type="button"
                    onClick={() => deactivate(String(a.id))}
                    className="text-xs text-rose-600 hover:underline"
                  />
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </tbody>
    </table>
  </div>
};
</table>
</div>
<p className="mt-3 text-xs text-slate-500">
Categories: {ACHIEVEMENT_CATEGORIES.join(",")} • Rarities:{"•"}
{ACHIEVEMENT_RARITIES.join(",")}
</p>
</>
);
}

function ChallengesTab() {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    (async () => {
      try {
        setItems(await adminGamificationApi.listChallenges());
      } catch {
        addToast("error", "Failed to load challenges.");
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  if (loading) return <Spinner/>;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Metric</th>
            <th className="px-3 py-2 text-right">Target</th>
            <th className="px-3 py-2 text-right">XP</th>
            <th className="px-3 py-2 text-right">Weight</th>
            <th className="px-3 py-2 text-center">Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((c) => (
            <tr key={String(c.id)} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-mono text-xs">{String(c.id)}</td>
              <td className="px-3 py-2 font-medium">{String(c.title)}</td>
              <td className="px-3 py-2 text-slate-600">{String(c.metric)}</td>
              <td className="px-3 py-2 text-right">{String(c.target)}</td>
              <td className="px-3 py-2 text-right">{String(c.xpReward)}</td>
              <td className="px-3 py-2 text-right">{String(c.weight??1)}</td>
              <td className="px-3 py-2 text-center">
                {c.isActive ? "√" : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrantTab() {
  const addToast = useToastStore((s) => s.addToast);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("Manual adjustment");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;
    setBusy(true);
    try {
      await adminGamificationApi.grantXp(userId.trim(), amount, reason.trim());
      addToast("success", "XP granted.");
      setUserId("");
    } catch {
      addToast("error", "Failed to grant XP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3.5">
        <p className="text-sm text-blue-900">
          <strong>Manual XP adjustment:</strong> Use this tool for one-off corrections (e.g., bug fixes, missed credits, support resolutions). All grants are logged in the activity audit trail with your admin ID, the amount, and the reason provided. Streak multipliers are not applied to manual grants.
        </p>
      </div>
      <form>
        onSubmit={submit}
        className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-700">User ID</span>
        </label>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </form>
    </div>
  );
}
className="mt-1·w-full·rounded-md·border·border-slate-300·px-3·py-2·text-sm"
placeholder="MongoDB·ObjectId"
required
</label>
<label className="block">
<span className="text-sm·font-medium·text-slate-700">Amount</span>
<input
type="number"
value={amount}
onChange={(e) => setAmount(Number(e.target.value))}
className="mt-1·w-full·rounded-md·border·border-slate-300·px-3·py-2·text-sm"
required
</label>
<label className="block">
<span className="text-sm·font-medium·text-slate-700">Reason</span>
<input
value={reason}
onChange={(e) => setReason(e.target.value)}
className="mt-1·w-full·rounded-md·border·border-slate-300·px-3·py-2·text-sm"
required
</label>
<button
type="submit"
disabled={busy}
className="rounded-md·bg-primary-600·px-4·py-2·text-sm·font-medium·text-white·hover:bg-primary-700·disabled:opacity-60"
>
{busy?."Granting...":"Grant·XP"}
</button>
</form>
</>
);
}

function StatTile({label, value}:{·label:·string;·value:·string·}) {
return (
<div className="rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
<div className="text-xs·font-semibold·uppercase·tracking-wide·text-slate-500">
{label}
</div>
<div className="mt-2·text-2x1·font-bold·text-slate-900">{value}</div>
</div>
);
}