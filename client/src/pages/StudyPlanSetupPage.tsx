import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {type StudyPlanParameters, SUBJECT_AREAS, type SubjectArea} from "@upcat/shared";
import {studyPlanApi} from "@/lib/studyPlanApi";
import Seo from "@/components/Seo";

export default function StudyPlanSetupPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Array<{id: string; name: string; targetDuration: number}}>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [templateId, setTemplateId] = useState<string>|null>(null);
  const [diagnosticMethod, setDiagnosticMethod] = useState<none>|{"historical"|{"self_assessment"|{"none"}});
  const [selfAssessment, setSelfAssessment] = useState<Record<SubjectArea, "beginner"|{"intermediate"|{"advanced"}}>(
    Object.fromEntries(SUBJECT_AREAS.map((s) => [s, "beginner"])) as Record<SubjectArea, "beginner"|{"intermediate"|{"advanced"}},
  );

  const [parameters, setParameters] = useState<StudyPlanParameters>({
    targetExamDate: null,
    availableHoursPerDay: 2,
    studyDaysPerWeek: [1, 2, 3, 4, 5],
    startDate: new Date().toISOString(),
    preferredStudyTime: "flexible",
    learningStyle: "mixed",
    difficultyPreference: "balanced",
    prioritySubjects: null,
    excludeSubjects: null,
    includeBreakDays: true,
    breakFrequency: 7,
  });

  useEffect(() => {
    void studyPlanApi.getTemplates().then((rows) => {
      setTemplates(rows.map((r) => ({id: r.id, name: r.name, targetDuration: r.targetDuration})));
      setTemplateId(rows[0]?.id??null);
    }).catch(() => setTemplates([]));
  }, []);

  const toggleStudyDay = (day: number) => {
    setParameters((prev) => {
      const has = prev.studyDaysPerWeek.includes(day);
      const next = has ? prev.studyDaysPerWeek.filter((d) => d !== day) : [...prev.studyDaysPerWeek, day];
      return {...prev, studyDaysPerWeek: next.sort((a, b) => a - b)};
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const skip = diagnosticMethod !== "none"
        ? await studyPlanApi.skipDiagnostic({
          method: diagnosticMethod,
          selfAssessment: diagnosticMethod === "self_assessment"
        }) ? SUBJECT_AREAS.map((subjectArea) => ({subjectArea, level: selfAssessment[subjectArea]}))
        : undefined;
    })
    : null;

    const generated = await studyPlanApi.generatePlan({
      templateId,
      parameters,
      diagnosticId: null,
      diagnosticMethod,
    });

    if (skip?.diagnosticResults) {
      void skip;
    }

    navigate(`/study-plan?created=${generated.planId}`);
  } finally {
    setSubmitting(false);
  }
};

return (
  <div className="mx-auto max-w-4x1 space-y-6 px-4 py-8">
    <Seo title="Study Plan Setup" description="Configure your personalized UPCAT study plan."/>
    <h1 className="text-3xl font-black tracking-tight text-slate-900">Study Plan Setup Wizard</h1>

    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Step 1: Diagnostic</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        [
          {value: "none", label: "Skip - Start Fresh"},
          {value: "historical", label: "Use Practice History"},
          {value: "self_assessment", label: "I'll Self-Assess"},
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDiagnosticMethod(opt.value as any)}
            className={`rounded-lg border px-3 py-2 text-sm ${diagnosticMethod === opt.value ? "border-sky-500 bg-sky-50" : "border-slate-300 hover:bg-slate-50"}`}
        >
          {opt.label}
        </button>
      ))
    </div>
    {diagnosticMethod === "self_assessment" && (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SUBJECT_AREAS.map((subject) => (
          <label key={subject} className="text-sm">
            <div className="font-medium">{subject}</div>
          </label>
        ))}
      </div>
    )}
  </div>
  {diagnosticMethod === "self_assessment" && (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {SUBJECT_AREAS.map((subject) => (
        <label key={subject} className="text-sm">
          <div className="font-medium">{subject}</div>
        </label>
      ))}
    </div>
  )}
value={selfAssessment[subject]}
onChange={(e) => setSelfAssessment((prev) => ({
...prev,
[subject]: e.target.value as any
}))}
>
<option value="beginner">Beginner</option>
<option value="intermediate">Intermediate</option>
<option value="advanced">Advanced</option>
</select>
</label>
))}
</div>
})
</section>

<section className="rounded-xl·border·border-slate-200·bg-white·p-5">
<h2 className="text-lg·font-semibold">Step·2: Schedule Preferences</h2>
<div className="mt-3·grid·gap-3·sm:grid-cols-2">
<label className="text-sm">
Target·exam·date
<input
type="date"
className="mt-1·w-full·rounded·border·border-slate-300·px-2·py-1"
onChange={(e) => {
const value = e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString() : null;
setParameters((prev) => ({...prev, targetExamDate: value}));
}}
>
</label>
<label className="text-sm">
Hours·per·day·({parameters.availableHoursPerDay.toFixed(1)})h
<input
type="range"
min={0.5}
max={6}
step={0.5}
value={parameters.availableHoursPerDay}
onChange={(e) => setParameters((prev) => ({
...prev,
availableHoursPerDay: Number(e.target.value)
}))}
<label className="mt-2·w-full"
/>
</label>
</div>
<div className="mt-4">
<p className="text-sm·font-medium">Study·days</p>
<div className="mt-2·flex·flex-wrap·gap-2">
{[1, 2, 3, 4, 5, 6, 7].map((day) => (
<button
key={day}
type="button"
onClick={() => toggleStudyDay(day)}
className={`rounded-lg border px-3 py-1 text-sm ${parameters.studyDaysPerWeek.includes(day) ? "border-emerald-500 bg-emerald-50" : "border-slate-300"}`}
>
{day === 1 ? "Mon" : day === 2 ? "Tue" : day === 3 ? "Wed" : day === 4 ? "Thu" : day === 5 ? "Fri" : day === 6 ? "Sat" : "Sun"}
</button>
))}
</div>
</div>
</section>

<section className="rounded-xl·border·border-slate-200·bg-white·p-5">
<h2 className="text-lg·font-semibold">Step·3: Study·Preferences</h2>
<div className="mt-3·grid·gap-3·sm:grid-cols-3">
<select
className="rounded·border·border-slate-300·px-2·py-2·text-sm"
value={parameters.learningStyle}
onChange={(e) => setParameters((prev) => ({...prev, learningStyle: e.target.value as any}))}
>
<option value="mixed">Mixed</option>
<option value="visual">Visual</option>
<option value="reading">Reading</option>
<option value="practice">Practice-heavy</option>
</select>
<select
className="rounded·border·border-slate-300·px-2·py-2·text-sm"
value={parameters.difficultyPreference}
onChange={(e) => setParameters((prev) => ({
...prev,
difficultyPreference: e.target.value as any
}))}
>
<option value="gradual">Gradual</option>
<option value="balanced">Balanced</option>
<option value="aggressive">Aggressive</option>
</select>
<select
className="rounded·border·border-slate-300·px-2·py-2·text-sm"
value={templateId??"}}
onChange={(e) => setTemplateId(e.target.value)}
>
{templates.map((t) => (
<option key={t.id} value={t.id}}{t.name}({t.targetDuration}w)</option>
))}
</select>
</div>
</section>

<div className="flex·justify-end">
<button
type="button"
disabled={submitting}
onClick={submit}
className="rounded-xl·bg-sky-600·px-5·py-3·font-semibold·text-white·hover:bg-sky-700·disabled:opacity-50"
{
  submitting:?"Generating·Plan...":::"Looks·good!·Start·My·Plan"}
</button>
</div>
</div>
);