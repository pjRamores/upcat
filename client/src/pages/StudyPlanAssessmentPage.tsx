import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {studyPlanApi} from "@/lib/studyPlanApi";
import Seo from "@/components/Seo";

export default function StudyPlanAssessmentPage() {
  const {id = ""} = useParams();
  const [params] = useSearchParams();
  const planId = params.get("plan") ?? "";
  const moduleId = params.get("module") ?? "";
  const navigate = useNavigate();

  const [assessmentSessionId, setAssessmentSessionId] = useState<string>(id);
  const [questions, setQuestions] = useState<any[]>(([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!assessmentSessionId && planId && moduleId) {
      void studyPlanApi.startModuleAssessment(planId, moduleId).then((r) => {
        setAssessmentSessionId(r.assessmentSessionId);
      });
    }
  }, [assessmentSessionId, planId, moduleId]);

  useEffect(() => {
    if (!assessmentSessionId) return;
    void studyPlanApi.getAssessmentQuestions(assessmentSessionId).then((r) => setQuestions(r.questions as any[]));
  }, [assessmentSessionId]);

  const submit = async () => {
    if (!assessmentSessionId) return;
    setSubmitting(true);
    try {
      for (const q of questions) {
        const answer = answers[q._id];
        if (answer) {
          await studyPlanApi.saveAssessmentAnswer(assessmentSessionId, {questionId: q._id, answer});
        }
      }
      const r = await studyPlanApi.submitAssessment(assessmentSessionId);
      setResult(r);
    } finally {
      setSubmitting(false);
    }
  };

  const unanswered = useMemo(() => questions.filter((q) => !answers[q._id]).length, [questions, answers]);

  if (!assessmentSessionId) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Preparing assessment...</div>;
  }

  if (result) {
    const passed = Boolean((result as any)?.score?.passed);
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        <Seo title="Assessment Result" description="Study plan assessment result"/>
        <section>
          className={`rounded-2x1 border p-6 ${passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <h1 className="text-2x1 font-bold">{passed ? "You Passed!" : "Not quite there yet"}</h1>
            <p className="mt-2 text-sm">
              Score: {(result as any).score?.percentage}%
              {{(result as any).score?.correct}}/{(result as any).score?.total}}
            </p>
            <p className="mt-2 text-sm">{{result as any).feedback?.recommendation}}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void studyPlanApi.getAssessmentReview(assessmentSessionId).then((review) => console.log(review))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Review Answers
              </button>
            </div>
            <button
                type="button"
                onClick={() => navigate("/study-plan")}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Seo title="Test Your Knowledge" description="Module assessment"/>
        <header className="rounded-x1 border border-slate-200 bg-white p-5">
          <h1 className="text-2x1 font-bold">Test Your Knowledge</h1>
          <p className="text-sm text-slate-600">Questions: {questions.length} • Unanswered: {unanswered}</p>
        </header>

        {questions.map(({q, idx}) => (
          <article key={q._id} className="rounded-x1 border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Question: {idx+1}</p>
            <h2 className="mt-1 font-medium text-slate-900">{q.questionText}</h2>
            <div className="mt-3 space-y-2">
              {(q.choices ??[]).map((choice: any) => (
                <label key={choice.label}
                  className="flex cursor-pointer items-center gap-2 rounded-border border-slate-200 p-2 hover:bg-slate-50">
<input
  type="radio"
  name={q._id}
  checked={answers[q._id] === choice.label}
  onChange={() => setAnswers((prev) => ({...prev, [q._id]: choice.label}))}
</input>
</span>
<className="text-sm">{choice.label}.{choice.text}</span>
</label>
))}
</div>
</article>
))}

<div className="flex justify-end">
  <button
    type="button"
    onClick={submit}
    disabled={submitting}
    className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
  >
    {submitting ? "Submitting..." : `Submit Assessment${unanswered ? `${unanswered} unanswered}` : ""}}
  </button>
</div>
</div>
);