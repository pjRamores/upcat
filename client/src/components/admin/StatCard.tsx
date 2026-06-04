import type { ReactNode } from "react";

interface Props {
    label: string;
    value: ReactNode;
    hint?: string;
    trend?: { direction: 'up' | 'down' | 'flat'; label: string };
    icon?: ReactNode;
    accent?: 'violet' | 'indigo' | 'emerald' | 'amber' | 'rose';
}

const ACCENTS = {
    violet: "border-primary-200 bg-primary-50 text-primary-700",
    indigo: "border-primary-200 bg-primary-50 text-primary-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-primary-200 bg-primary-50 text-primary-700",
};

export default function StatCard({ label, value, hint, trend, icon, accent = "violet" }: Props) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                {icon && (
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg border-${ACCENTS[accent]}`}>
                        {icon}
                    </span>
                )}
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            {(trend || hint) && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    {trend && (
                        <span
                            className={
                                trend.direction === "up"
                                    ? "text-emerald-600"
                                    : trend.direction === "down"
                                        ? "text-primary-600"
                                        : "text-slate-500"
                            }
                        >
                            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : ""}
                        </span>
                    )}
                    {hint && <span>{hint}</span>}
                </div>
            )}
        </div>
    );
}