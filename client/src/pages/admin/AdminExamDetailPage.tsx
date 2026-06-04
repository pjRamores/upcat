import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Spinner from "@/components/Spinner";
import Badge from "@/components/admin/Badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MathText from "@/components/MathText";
import { adminApi } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";
import { type Difficulty, DIFFICULTY_LABELS, SUBJECT_AREAS } from "@upcat/shared";

interface ExamDetail {
  session: {
    id: string;
    setId?: string | null;
    setName?: string | null;
    status: string;
    startedAt: string;
    completedAt?: string | null;
    score?: {
      percentage?: number;
      correct?: number;
      incorrect?: number;
      unanswered?: number;
      total?: number;
      bySubject?: Record<string, { correct: number; total: number; percentage: number }>;
    };
    config?: { totalQuestions?: number; timeLimit?: number };
  };
  user: { _id: string; firstName: string; lastName: string; email: string } | null;
  questions: Array<{
    questionId: string;
    orderIndex: number;
    userAnswer: string | null;
    isCorrect: boolean | null;
    timeSpent: number | null;
    question: {
      subjectArea: string;
      subtopic: string;
      difficulty: string;
      questionText: string;
      choices: { label: string; text: string }[];
      correctAnswer: string;
      rationale: string
    } | null;
  }>;
}

export default function AdminExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [questionPage, setQuestionPage] = useState(1);
  const QUESTIONS_PER_PAGE = 10;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const d = (await adminApi.getExam(id)) as unknown as ExamDetail;
        if (!cancelled) setData(d);
      } catch (e) {
        const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
        addToast("error", msg ?? "Could not load session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, addToast]);

  useEffect(() => {
    setQuestionPage(1);
  }, [data?.questions.length, subjectFilter]);

  if (loading) return <div className="flex justify-center py-20"><Spinner/></div>;
  if (!data) return null;
  const s = data.session;
  const filteredQuestions = subjectFilter
    ? data.questions.filter((q) => q.question?.subjectArea === subjectFilter)
    : data.questions;
  const totalQuestionPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE));
  const clampedQuestionPage = Math.min(questionPage, totalQuestionPages);
  const pageStart = (clampedQuestionPage - 1) * QUESTIONS_PER_PAGE;
  const pagedQuestions = filteredQuestions.slice(pageStart, pageStart + QUESTIONS_PER_PAGE);

  const onDelete = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      await adminApi.deleteExam(id);
      addToast("success", "Mock exam session deleted.");
      navigate("/admin/exams");
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Failed to delete session.");
    } finally {
setDeleting(false);
setConfirmDelete(false);

return (
  <div className="space-y-6">
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Session {s._id.slice(-8)}</h2>
          <p className="text-sm text-slate-500">{data.user ? <Link to={`/admin/users/${data.user.id}`}>{data.user.firstName} {data.user.lastName}</Link> : "deleted user"}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={s.status === "completed" ? "success" : s.status === "in_progress" ? "info" : "warning"}>{s.status}</Badge>
          <span className="text-xs text-slate-500">Exam set: {s.setName?.trim() || 'Unknown'}</span>
          <span className="text-xs text-slate-500">Started {new Date(s.startedAt).toLocaleString()}</span>
          {s.completedAt && <span className="text-xs text-slate-500">Completed {new Date(s.completedAt).toLocaleString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setConfirmDelete(true)}>Delete session</button>
        <Link to="/admin/exams" className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50">Back</Link>
      </div>
    </div>
  {s.score && (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Score" value={`${s.score.percentage?.toFixed(1) ?? "-"}%`}/>
      <Stat label="Correct" value={String(s.score.correct ?? 0)}/><Stat label="Incorrect" value={String(s.score.incorrect ?? 0)}/><Stat label="Unanswered" value={String(s.score.unanswered ?? 0)}/></div>
    )}
    {s.score?.bySubject && (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-700">Subject breakdown</h3>
        <ul className="divide-y divide-slate-100 text-sm">
          {Object.entries(s.score.bySubject).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between py-2"><span>{k}</span><span className="text-xs text-slate-500">{v.correct / (v.total) * (v.percentage.toFixed(1)) %}</span></li>
          ))}
        </ul>
      </section>
    )}
  <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-700">Questions</h3><div className="flex items-center gap-2 text-xs text-slate-500">{filteredQuestions.length === 0 ? "0 of 0" : `${pageStart + 1}-${Math.min(pageStart + QUESTIONS_PER_PAGE, filteredQuestions.length)} of ${filteredQuestions.length}`}</div></div>
    <span>{(filteredQuestions.length === 0) ? "0 of 0" : `${pageStart + 1}-${Math.min(pageStart + QUESTIONS_PER_PAGE, filteredQuestions.length)} of ${filteredQuestions.length}`}</span>
    <button type="button" onClick={() => setQuestionPage((p) => Math.max(1, p - 1))} disabled={clampedQuestionPage <= 1} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">Prev</button>
    <span>Page {clampedQuestionPage} / {totalQuestionPages}</span>
    <button type="button" onClick={() => setQuestionPage((p) => Math.min(totalQuestionPages, p + 1))} disabled={clampedQuestionPage >= totalQuestionPages} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">Next</button>
    </div>
  <div className="flex flex-wrap gap-2"><{["", ...SUBJECT_AREAS] as const}.map((subject) => (
    <button key={subject || "all-subjects"} type="button" onClick={() => setSubjectFilter(subject)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${subjectFilter === subject ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{subject || "All subjects"}</button>
  ))}
<div>
  {pagedQuestions.map(({ q }) => (
    <article key={q.questionId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-700">{Q(q.orderIndex + 1)}</span>
        {q.question && <Badge variant="info">{q.question.subjectArea}</Badge>}
        {q.question && (
          <Badge
            variant={q.question.difficulty === "easy" ? "success" : q.question.difficulty === "very_hard" ? "danger" : q.question.difficulty === "hard" ? "warning" : "warning"}
            {...DIFFICULTY_LABELS[q.question.difficulty as Difficulty] ?? q.question.difficulty}
          />
        )}
        {q.userAnswer === null ? <Badge variant="neutral">Unanswered</Badge> : q.isCorrect ? <Badge variant="success">Correct</Badge> : <Badge variant="danger">Incorrect</Badge>}
        {q.timeSpent !== null && <span className="text-slate-500">{q.timeSpent}s</span>}
      </header>
      {q.question ? (
        <>
          <div className="text-sm text-slate-800"><MathText>{q.question.questionText}</MathText></div>
          <ul className="mt-2 space-y-1 text-sm">
            {q.question.choices.map((c) => {
              const isCorrect = c.label === q.question!.correctAnswer;
              const isUser = c.label === q.userAnswer;
              const cls = isCorrect ? "border-emerald-300 bg-emerald-50" : isUser ? "border-primary-300 bg-primary-50" : "border-slate-200";
              return (
                <li key={c.label} className={`flex items-start gap-2 rounded border p-2 ${cls}`}>
                  <span className="font-bold">{c.label}.<span className="flex-1"><MathText>{c.text}</MathText></span>
                  {isUser && <span className="text-xs">(user)</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Rationale</p>
        <MathText>{q.question.rationale || "No rationale provided."}</MathText>
      </div>
    </article>
  )) : <p className="text-sm text-slate-400">Question deleted.</p>}
  )}
  {filteredQuestions.length === 0 && (
    <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
      No questions found for this subject.
    </p>
  )}
</section>

<ConfirmDialog
  isOpen={confirmDelete}
  title="Delete mock exam session?"
  message="This permanently removes the session record and cannot be undone."
  confirmText="DELETE"
  confirmLabel={deleting ? "Deleting..." : "Delete"}
  variant="danger"
  onClose={() => setConfirmDelete(false)}
  onConfirm={onDelete}
/>
</div>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}