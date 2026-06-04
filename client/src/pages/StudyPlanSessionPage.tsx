import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { studyPlanApi } from "@/lib/studyPlanApi";
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
    const { sessionId = "" } = useParams();
    const [params] = useSearchParams();
    const planId = params.get("plan") ?? "";

    const [session, setSession] = useState<any>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

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
                result: activity.type === "assessment" ? { score: 80, passed: true } : undefined,
            });
            const next = await studyPlanApi.getSession(planId, sessionId);
            setSession(next);
        } finally {
            setBusyId(null);
        }
    };

    if (!session) {
        return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Loading session...</div>;
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
            <Seo title={session.title ?? "Study Session"} description="Daily study session" />
            <header className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Day {session.dayNumber}</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{session.title}</h1>
                <p className="mt-1 text-sm text-slate-600">Estimated time: {session.estimatedMinutes} minutes</p>
            </header>

            <section className="space-y-3">
                {activities.map((activity) => (
                    <article key={activity.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{activity.type}</p>
                                <h2 className="text-lg font-semibold text-slate-900">{activity.title}</h2>
                                <p className="text-sm text-slate-600">{activity.description}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{activity.status}</span>
                        </div>

                        {activity.lessonContent?.content?.sections &&
                            activity.lessonContent.content.sections.map((section: any, idx: number) => (
                                <div key={idx}>
                                    <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                                    <p className="text-sm text-slate-700">{section.content}</p>
                                    {section.formula ? <p className="mt-1 rounded bg-white px-2 py-1 font-mono text-xs">{section.formula}</p> : null}
                                </div>
                            ))}
                        </article>
                    </div>
                ))}
            </section>

            <div className="flex justify-between">
                <Link to="/study-plan" className="text-sm text-sky-700 hover:underline">Back to Study Plan</Link>
                <button type="button" onClick={() => void studyPlanApi.skipSession(planId, sessionId)}.then(() => studyPlanApi.getSession(planId, sessionId)).then(setSession)}
class Name="text-sm text-amber-700 hover:underline"
>
  Skip Session
</button>
</div>
</div>;
}