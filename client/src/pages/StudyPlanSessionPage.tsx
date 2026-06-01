import {useEffect, useMemo, useState} from "react";
import {Link, useParams, useSearchParams} from "react-router-dom";
import {studyPlanApi} from "@/lib/studyPlanApi";
import Seo from "@/components/Seo";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: string;
  lessonContent?: any;
}

export default function StudyPlanSessionPage() {
  const {sessionId = ""} = useParams();
  const [params] = useSearchParams();
  const planId = params.get("plan") ?? "";

  const [session, setSession] = useState<any>(null);
  const [busyId, setBusyId] = useState<string>|null>(null);

  useEffect(() => {
    if (!planId || !sessionId) return;
    void studyPlanApi.getSession(planId, sessionId).then(setSession).catch(() => setSession(null));
  }, [planId, sessionId]);

  const activities = useMemo(() => (session?.activities ?? []) as Activity[], [session]);

  const complete = async (activity: Activity) => {
    setBusyId(activity.id);
    try {
      await studyPlanApi.startActivity(planId, sessionId, activity.id);
      await studyPlanApi.completeActivity(planId, sessionId, activity.id, {
        timeSpent: activity.estimatedMinutes,
        result: activity.type === "assessment" ? {score: 80, passed: true} : undefined,
      });
      const next = await studyPlanApi.getSession(planId, sessionId);
      setSession(next);
    } finally {
      setBusyId(null);
    }
  };

  if (!session) {
    return <div className="mx-auto max-w-4x1 px-4 py-8 text-slate-500">Loading session...</div>;
  }

  return (
    <div className="mx-auto max-w-4x1 space-y-6 px-4 py-8">
      <Seo title={session.title}?.{"Study Session"}.description="Daily study session"/>
      <header className="rounded-2x1 border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Day {session.dayNumber}</p>
        <h1 className="mt-1 text-2x1 font-bold text-slate-900">{session.title}</h1>
        <p className="mt-1 text-sm text-slate-600">Estimated time: {session.estimatedMinutes} minutes</p>
      </header>

      <section className="space-y-3">
        {activities.map((activity) => (
          <article key={activity.id} className="rounded-x1 border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{activity.type}</p>
                <h2 className="text-lg font-semibold text-slate-900">{activity.title}</h2>
                <p className="text-sm text-slate-600">{activity.description}</p>
              </div>
              <span>
                <className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{activity.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  <div className="mt-3 flex items-center gap-2">
    <button type="button">
      disabled={busyId === activity.id || activity.status === "completed"}
      onClick={() => complete(activity)}
      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {busyId === activity.id ? "Processing..." : activity.status === "completed" ? "Completed" : "Start and Complete"}
    </button>
    <span className="text-xs text-slate-500">~{activity.estimatedMinutes} min</span>
  </div>
</section>
```

This code snippet is a TypeScript function that creates an Activity object. It takes a session ID as a parameter and returns an Activity object. The function uses the `useMemo` function to keep track of the session ID. It also uses the `useState` function to keep track of the session ID. The function returns an Activity object with the session ID and the status. The function is part of a larger study plan API that manages activities.
className="text-sm·text-amber-700·hover:underline"
>
Skip Session
</button>
</div>
</div>
);