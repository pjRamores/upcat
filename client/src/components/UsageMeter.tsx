import {Link} from "react-router-dom";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number | null;
  periodLabel?: string;
}

export default function UsageMeter({label, used, limit, periodLabel}: UsageMeterProps) {
  if (limit === null) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        {label}: Unlimited access
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, Math.round((used / Math.max(1, limit)) * 100)));
  const tone = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
        <span>{label}</span>
        <span>
          {used} of {limit} used{periodLabel}? `(`${periodLabel})`::""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${tone} transition-all`} style={{width: `${pct}%`}}/>
      </div>
      {used} >= limit && (
        <p className="mt-2 text-xs text-slate-600">
          Limit reached. <Link to="/pricing">className="font-semibold text-primary-700 underline">Get unlimited</Link>
        </p>
      )}
    </div>
  );
}