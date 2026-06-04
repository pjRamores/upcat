import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SUBJECT_AREAS, type SubjectArea } from "@upcat/shared";
import { studyPlanApi } from "@/lib/studyPlanApi";
import Seo from "@/components/Seo";

export default function StudyPlanDiagnosticPage() {
    const navigate = useNavigate();
    const { id = "" } = useParams();
    const [sectionIndex, setSectionIndex] = useState(0);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const section = SUBJECT_AREAS[sectionIndex] as SubjectArea;

    useEffect(() => {
        if (!id) return;
        void studyPlanApi.getDiagnosticQuestions(id, section).then((r) => setQuestions(r.questions as any[]));
    }, [id, section]);

    const submitSection = async () => {
        if (!id) return;
        await studyPlanApi.submitDiagnosticSection(id, {
            subjectArea: section,
            answers: questions
                .map((q) => ({ questionId: q._id, answer: answers[q._id] }))
                .filter((row: { questionId: string; answer: string }) => Boolean(row.answer))
                .map((row) => ({ ...row, timeSpent: 30 })),
        });

        if (sectionIndex < SUBJECT_AREAS.length - 1) {
            setSectionIndex((s) => s + 1);
            setAnswers({});
            return;
        }

        await studyPlanApi.completeDiagnostic(id);
        navigate("/study-plan/setup");
    };

    return (
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
            <Seo title="Diagnostic Test" description="Assess your baseline knowledge for a personalized plan." />
            <h1 className="text-2xl font-bold text-slate-900">Diagnostic - {section}</h1>
            <p className="text-sm text-slate-600">Section {sectionIndex + 1} of {SUBJECT_AREAS.length}</p>

            {questions.map((q, idx) => (
                <article key={q._id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-500">Question {idx + 1} of {questions.length}</p>
                    <p className="mt-1 font-medium">{q.questionText}</p>
                    <div className="mt-2 space-y-2">
                        {q.choices ?? []).map((c: any) => (
                            <label key={c.label}>
                                <div className="flex items-center gap-2 rounded border border-slate-200 p-2">
                                    <input type="radio" name={q._id} checked={answers[q._id] === c.label} onChange={() => setAnswers((prev) => ({ ...prev, [q._id]: c.label }))} />
                                    <span>{c.label}. {c.text}</span>
                                </div>
                        ))}
                    </div>
                </article>
            ))}
            <div className="flex justify-end">
                <button type="button" onClick={submitSection} className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white">
                    {sectionIndex < SUBJECT_AREAS.length - 1 ? "Submit Section" : "Complete Diagnostic"}
                </button>
            </div>
        </div>
    );
}