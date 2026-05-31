import {useEffect, useState} from "react";
import {studyPlanAdminApi} from "@/lib/studyPlanApi";

export default function AdminStudyPlanAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Record<string, any>>(null);

  useEffect(() => {
    void studyPlanAdminApi.getAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2x1 font-bold text-slate-900">Study Plan Analytics</h1>
      {!analytics ? <p className="text-sm text-slate-500">Loading analytics...</p> : null}
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Tile label="Active Plans" value={analytics.totalActivePlans ?? 0}/>
          <Tile label="Completed Plans" value={analytics.totalCompletedPlans ?? 0}/>
          <Tile label="Completion Rate" value={`${analytics.averageCompletionRate ?? 0}%`}/>
        </div>
      )}
    </div>
  );
}

function Tile({label, value}: {label: string; value: string | number}) {
  return (
    <div className="rounded-x1 border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-900">Most Failed Modules</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {analytics.mostDifficultModules ?? []).map((m: any) => (
          <li key={m._id} className="rounded-border border-slate-200 px-3 py-2">
            {m._id}: {m.fails} fails (avg {Math.round(m.avgScore ?? 0)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}