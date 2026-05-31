import {useEffect, useState} from "react";
import StatCard from "@/components/admin/StatCard";
import Spinner from "@/components/Spinner";
import {adminApi} from "@/lib/adminApi";
import {type Difficulty, DIFFICULTY_LABELS} from "@upcat/shared";

type Period = "week" | "month" | "year" | "all";

interface AnalyticsResp {
  period: Period;
  userMetrics: {
    totalUsers: number;
    verificationRate: number;
    retentionRate: number;
    registrationsByDay: { date: string; count: number }[];
  };
  examMetrics: {
    completionsByDay: { date: string; count: number; averageScore: number | null }[];
    averageScore: number;
    completionRate: number;
    abandonmentRate: number;
    averageTimePerQuestionSec: number;
    averageExamDurationSec: number;
    scoreDistribution: { range: string; count: number }[];
  };
  questionMetrics: {
    hardest: {
      _id: string;
      preview: string;
      subjectArea: string;
      difficulty: string;
      attempts: number;
      accuracy: number;
      flagCount: number
    }[];
    easiest: typeof Empty;
    mostUsed: typeof Empty;
    mostFlagged: typeof Empty;
    neverUsed: typeof Empty;
  };
  subjectMetrics: Record<string, Record<string, number>>;
  engagementMetrics: { dau: number; wau: number; mau: number };
  flagsByStatus: Record<string, number>;
}

const Empty = [] as {
  _id: string;
  preview: string;
  subjectArea: string;
  difficulty: string;
  attempts: number;
  accuracy: number;
  flagCount: number
} [];

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const d = (await adminApi.analytics(period)) as unknown as AnalyticsResp;
        if (!cancelled) setData(d);
      } catch (e) {
        const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
        setErr(msg ?? "Could not load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {["week", "month", "year", "all"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              period === p ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p === "all" ? "All time" : `Last ${p}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : err || !data ? (
        <p className="rounded-md bg-primary-50 p-4 text-sm text-primary-700">{err}</p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
<StatCard label="DAU" value={data.engagementMetrics.dau} hint="Daily·active"
icon={<span>◎</span>} accent="emerald"/>
<StatCard label="WAU" value={data.engagementMetrics.wau} hint="Weekly·active"
icon={<span>☽</span>} accent="indigo"/>
<StatCard label="MAU" value={data.engagementMetrics.mau} hint="Monthly·active"
icon={<span>☽</span>} accent="violet"/>
<StatCard label="Retention" value={`${data.userMetrics.retentionRate}%`}
hint="≥2·completed·exams" icon={<span>◎</span>} accent="amber"/>
</section>

<section className="grid·grid-cols-1·gap-4·sm:grid-cols-2·lg:grid-cols-4">
<StatCard label="Avg·Score" value={`${data.examMetrics.averageScore}%`} icon={<span>◎</span>}
accent="violet"/>
<StatCard label="Completion" value={`${data.examMetrics.completionRate}%`}
icon={<span>☽</span>} accent="emerald"/>
<StatCard label="Abandon" value={`${data.examMetrics.abandonmentRate}%`} icon={<span>◎</span>}
accent="rose"/>
<StatCard label="Avg·question"
value={`${data.examMetrics.averageTimePerQuestionSec.toFixed(1)}s`}
icon={<span>◎</span>} accent="indigo"/>
</section>

<section className="rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
<h2 className="mb-3·text-sm·font-bold·text-slate-700">Score·Distribution</h2>
<div className="flex·h-40·items-end·gap-2">
{data.examMetrics.scoreDistribution.map((b) => {
const max = Math.max(...data.examMetrics.scoreDistribution.map((x) => x.count), 1);
const h = (b.count / max) * 100;
return (
<div key={b.range} className="flex·flex-1·flex-col·items-center·justify-end">
<div className="w-full·rounded-t·bg-primary-500">style={{height: `${h}%`}}
title={`${b.count}·exams`}}
<span className="mt-1·text-[10px]·text-slate-500">{b.range}</span>
</div>
));
}}}
</div>
</section>

<section className="rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
<h2 className="mb-3·text-sm·font-bold·text-slate-700">Subject·×·Difficulty</h2>
<div className="overflow-x-auto">
<table className="min-w-full·text-sm">
<thead className="bg-slate-50·text-xs·uppercase·text-slate-500">
<tr>
<th className="px-3·py-2·text-left">Subject</th>
<th className="px-3·py-2·text-right">Easy</th>
<th className="px-3·py-2·text-right">Medium</th>
<th className="px-3·py-2·text-right">Hard</th>
<th className="px-3·py-2·text-right">Very·Hard</th>
</tr>
</thead>
<tbody>
<tr key={subj}>
<td className="px-3·py-2·font-medium·text-slate-800">{subj}</td>
<td className="px-3·py-2·text-right">{byDiff.easy??0}</td>
<td className="px-3·py-2·text-right">{byDiff.medium??0}</td>
<td className="px-3·py-2·text-right">{byDiff.hard??0}</td>
<td className="px-3·py-2·text-right">{byDiff.very_hard??0}</td>
</tr>
))}
</tbody>
</table>
</div>
</section>

<div className="grid·grid-cols-1·gap-6·lg:grid-cols-2">
<QuestionList title="Hardest·questions" rows={data.questionMetrics.hardest}
valueLabel="Accuracy" valueKey="accuracy" suffix="%"/>
<QuestionList title="Easiest·questions" rows={data.questionMetrics.easiest}
valueLabel="Accuracy" valueKey="accuracy" suffix="%"/>
<QuestionList title="Most·used" rows={data.questionMetrics.mostUsed} valueLabel="Attempts"
valueKey="attempts"/>
<QuestionList title="Most·flagged" rows={data.questionMetrics.mostFlagged} valueLabel="Flags"
valueKey="flagCount"/>
</div>
</>
})
</div>
);
}
```

function QuestionList({
  title,
  rows,
  valueLabel,
  valueKey,
  suffix = "",
}): {
  title: string;
  rows: {
    _id: string;
    preview: string;
    subjectArea: string;
    difficulty: string;
    attempts: number;
    accuracy: number;
    flagCount: number
  }[];
  valueLabel: string;
  valueKey: "accuracy" | "attempts" | "flagCount";
  suffix?: string;
}){
return (
  <section className="rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
    <h2 className="mb-3·text-sm·font-bold·text-slate-700">{title}</h2>
    {rows.length === 0 ? (
      <p className="text-sm·text-slate-400">No data.</p>
    ) : (
      <ul className="divide-y·divide-slate-100·text-sm">
        {rows.slice(0, 10).map((r) => (
          <li key={r._id} className="flex·items-start·justify-between·gap-3·py-2">
            <div className="min-w-0">
              <p className="truncate·text-slate-800">{r.preview}</p>
              <p className="text-xs·text-slate-500">{r.subjectArea} ···{DIFFICULTY_LABELS[r.difficulty·as·Difficulty]·??·r.difficulty}</p>
            </div>
            <span className="shrink-0·text-xs·font-sembold·text-slate-700">
              {r[valueKey]}{suffix}·<span className="font-normal·text-slate-400">{valueLabel.toLowerCase()}</span>
            </span>
          </li>
        ))}
      </ul>
    ))}
  </section>
);