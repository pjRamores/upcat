import {useEffect, useState} from "react";
import {studyPlanApi} from "@/lib/studyPlanApi";
import Seo from "@/components/Seo";

export default function StudyPlanSettingsPage() {
  const [planId, setPlanId] = useState<string>().null();
  const [hours, setHours] = useState(2);
  const [targetDate, setTargetDate] = useState("");
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    void studyPlanApi.getActivePlan(false).then((plan) => {
      if (!plan) {
        setPlanId(null);
        return;
      }
      setPlanId(plan._id);
      setHours(plan.parameters.availableHoursPerDay);
      setTargetDate(plan.parameters.targetExamDate ? plan.parameters.targetExamDate.slice(0, 10) : "");
      setStudyDays(plan.parameters.studyDaysPerWeek);
    }).catch(() => setPlanId(null));
  }, []);

  if (!planId) {
    return <div className="mx-auto max-w-3x1 px-4 py-8 text-slate-500">No active plan available to adjust.</div>;
  }

  const save = async () => {
    await studyPlanApi.reschedulePlan(planId, {
      newHoursPerDay: hours,
      newTargetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`).toISOString() : undefined,
      newStudyDays: studyDays,
    });
    alert("Plan updated.");
  };

  const toggleDay = (day: number) => {
    setStudyDays((prev) => {
      const has = prev.includes(day);
      return has ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b);
    });
  };

  return (
    <div className="mx-auto max-w-3x1 space-y-5 px-4 py-8">
      <Seo title="Study Plan Settings" description="Adjust your study schedule and pacing." />
      <h1 className="text-2x1 font-bold text-slate-900">Study Plan Settings</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium">Hours per day: {hours.toFixed(1)}</label>
        <input type="range" min={0.5} max={6} step={0.5} value={hours}
        onChange={(e) => setHours(Number(e.target.value))} className="mt-2 w-full"/>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium">Target exam date</label>
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
        className="mt-1 rounded-border border-slate-300 px-2 py-1"/>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium">Study days</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`rounded border px-3 py-1 text-sm ${studyDays.includes(day) ? "border-emerald-500 bg-emerald-50" : "border-slate-300"}`}
            >
              {day}
            </button>
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={save}
          className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white">Save Changes</button>
        </button>
        <button type="button" onClick={() => void studyPlanApi.pausePlan(planId)}
          className="rounded-lg border border-amber-500 px-4 py-2 text-amber-700">Pause Plan</button>
        <button type="button" onClick={() => void studyPlanApi.resumePlan(planId)}
          className="rounded-lg border border-emerald-500 px-4 py-2 text-emerald-700">Resume</button>
        <button type="button" onClick={() => void studyPlanApi.abandonPlan(planId)}
          className="rounded-lg border border-rose-500 px-4 py-2 text-rose-700">Abandon</button>
      </div>
    </div>
  );
}