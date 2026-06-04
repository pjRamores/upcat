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
}[];

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
                {(["week", "month", "year", "all"] as Period[]).map((p) => (
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
                <div className="flex justify-center py-20"><Spinner/></div>
            ) : err || !data ? (
                <p className="rounded-md bg-primary-50 p-4 text-sm text-primary-700">{err}</p>
            ) : (
                <>
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-700">{title}</h2>
        {rows.length === 0 ? (
            <p className="text-sm text-slate-400">No data.</p>
        ) : (
            <ul className="divide-y divide-slate-100 text-sm">
                {rows.slice(0, 10).map((r) => (
                    <li key={r._id} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                            <p className="truncate text-slate-800">{r.preview}</p>
                            <p className="text-xs text-slate-500">{r.subjectArea} · {DIFFICULTY_LABELS[r.difficulty as Difficulty] ?? r.difficulty}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-slate-700">
                            {r[valueKey]}{suffix} <span className="font-normal text-slate-400">{valueLabel.toLowerCase()}</span>
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </section>
);