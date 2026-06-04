import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { studyPlanApi } from "@lib/studyPlanApi";
import type { StudyPlan } from "@upcat/shared";
import Seo from "@/components/Seo";

export default function StudyPlanHubPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  useEffect(() => {
    let mounted = true;
    void studyPlanApi
      .getActivePlan(false)
      .then((data) => {
        if (mounted) setPlan(data);
      })
      .catch(() => {
        if (mounted) setPlan(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const todaySession = useMemo(() => {
    if (!plan) return null;
    return plan.curriculum.phases
      .flatMap((phase) => phase.modules.flatMap((module) => module.sessions.map((session) => ({
        phase,
        module,
        session
      }))))
      .find(({ session }) => session.status === "available" || session.status === "in_progress") ?? null;
  }, [plan]);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-slate-500">Loading your study plan...</div>;
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Seo title="Study Plan" description="Create your personalized UPCAT study plan." />
        <section>
          <div className="rounded-3xl border border-sky-100 bg-[radial-gradient(circle_at_top_left,_#f09ff,_e0f2fe_35%,_f8fafc_80%)] p-8" data-help="sp_diagnostic">
            <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-600">Personalized Study Plan</p>
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Create Your Personalized Study Plan</h1>
          <p className="mt-3 max-w-2xl text-slate-700">Get a structured, day-by-day curriculum tailored to your strengths, weaknesses, and schedule.</p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <Step title="Step 1" body="Take a quick diagnostic test or skip if you prefer." />
            <Step title="Step 2" body="Set your schedule, target date, and study preferences." />
            <Step title="Step 3" body="Generate your adaptive plan with module-end assessments." />
          </div>
          <div className="mt-7">
            <Link to="/study-plan/setup" className="inline-flex items-center rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700">Get Started</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Seo title="Study Plan Hub" description="Track your personalized UPCAT study progress." />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-help="sp_on_track">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {todaySession ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900">{todaySession.session.title}</h2>
              <p className="text-sm text-slate-600">{todaySession.phase.name} • {todaySession.module.name}</p>
            </>
          ) : (
            <h2 className="text-2xl font-bold text-slate-900">All sessions completed</h2>
          )}
        </div>
        {todaySession && (
          <Link to={`/study-plan/session/${todaySession.session.id}?plan=${plan._id}`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Start Today's Session
          </Link>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Progress" value={`${plan.progress.overallProgress}%`}
function Card({ title, value, hint }: { title: string; value: string; hint: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
    );
}