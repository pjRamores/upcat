import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "@/lib/api";
import AdSlot from "@/components/AdSlot";
import Spinner from "@/components/Spinner";
import MathText from "@/components/MathText";
import Seo from "@/components/Seo";
import FlagQuestionModal from "@/components/FlagQuestionModal";

import {
  API_ROUTES,
  type Difficulty,
  DIFFICULTY_LABELS,
  SUBJECT_AREAS,
  SUBJECT_META,
  type SubjectArea,
} from "@upcat/shared";

interface ReviewQ {
  _id: string;
  subjectArea: SubjectArea;
  difficulty: Difficulty;
  type: string;
  questionText: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctAnswer: "A" | "B" | "C" | "D";
  rationale: string;
  userAnswer: "A" | "B" | "C" | "D" | null;
  isCorrect: boolean;
  isFlagged?: boolean;
  isReported?: boolean;
  orderIndex: number;
  passage?: { title: string; content: string } | null;
}

type StatusFilter = "all" | "correct" | "incorrect" | "unanswered";

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [questions, setQuestions] = useState<ReviewQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [jumpSubject, setJumpSubject] = useState<SubjectArea | null>(null);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Set<string>>(() => {
    if (!sessionId) return new Set();
    try {
      const stored = localStorage.getItem(`upcat.reported_questions.${sessionId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [reportingId, setReportingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || reportedQuestionIds.size === 0) return;
    try {
      localStorage.setItem(
        `upcat.reported_questions.${sessionId}`,
        JSON.stringify(Array.from(reportedQuestionIds)),
      );
    } catch {
      // ignore
    }
  }, [reportedQuestionIds, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    void (async () => {
      try {
        const { data } = await apiClient.get(API_ROUTES.EXAM.REVIEW(sessionId));
        if (cancelled) return;

        const loadedQuestions = (data.data.questions ?? []) as ReviewQ[];

        const mergedQuestions = loadedQuestions.map((q) =>
          reportedQuestionIds.has(q._id) ? { ...q, isReported: true } : q,
        );

        setQuestions(mergedQuestions);
        setFlaggedQuestionIds(
          new Set(mergedQuestions.filter((q) => q.isFlagged).map((q) => q._id)),
        );
      } catch (e) {
        const msg =
          (e as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Could not load review";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, reportedQuestionIds]);

  const availableSubjects = useMemo(() => {
    const subjectSet = new Set(
      questions
        .filter((q) => {
          if (statusFilter === "correct" && !q.isCorrect) return false;
          if (statusFilter === "incorrect" && (q.isCorrect || q.userAnswer === null)) return false;
          if (statusFilter === "unanswered" && q.userAnswer !== null) return false;
          return true;
        })
        .map((q) => q.subjectArea),
    );

    return SUBJECT_AREAS.filter((s) => subjectSet.has(s));
  }, [questions, statusFilter]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (jumpSubject && q.subjectArea !== jumpSubject) return false;
      if (statusFilter === "correct" && !q.isCorrect) return false;
      if (statusFilter === "incorrect" && (q.isCorrect || q.userAnswer === null)) return false;
      if (statusFilter === "unanswered" && q.userAnswer !== null) return false;
      return true;
    });
  }, [questions, jumpSubject, statusFilter]);

  useEffect(() => {
    setActiveIndex(0);
  }, [jumpSubject, statusFilter]);

  useEffect(() => {
    setJumpSubject((prev) => {
      if (prev && availableSubjects.includes(prev)) return prev;
      return availableSubjects ?? null;
    });
  }, [availableSubjects]);

  const activeQuestion = filtered[activeIndex] ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-amber-600">{error}</p>
        <Link to="/dashboard" className="btn-secondary mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const summary = {
    correct: questions.filter((q) => q.isCorrect).length,
    incorrect: questions.filter((q) => !q.isCorrect && q.userAnswer !== null).length,
    unanswered: questions.filter((q) => q.userAnswer === null).length,
  };

  const markReported = (id: string) => {
    setReportedQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setQuestions((prev) =>
      prev.map((q) => (q._id === id ? { ...q, isReported: true } : q)),
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Seo
        title="Review Answers"
        description="Review your practice exam answers and rationales."
        noindex
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Answers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {summary.correct} correct • {summary.incorrect} incorrect • {summary.unanswered} unanswered
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ⚪ Marked in exam = your personal follow-up marker • 🚩 Report a content issue = sends
            feedback to admins for review
          </p>
        </div>
        <Link
          to={`/results/${sessionId}`}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Back to Results
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {activeQuestion ? (
            <QuestionCard
              key={activeQuestion._id}
              q={activeQuestion}
              isFlagged={flaggedQuestionIds.has(activeQuestion._id)}
              isReported={reportedQuestionIds.has(activeQuestion._id)}
              onReport={() => setReportingId(activeQuestion._id)}
            />
          ) : (
            <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              No questions match the current filters.
            </p>
          )}

          <div className="mt-4">
            <AdSlot slot="review_inline" />
          </div>
        </div>

        <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 lg:w-[320px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Subject</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              value={jumpSubject ?? ""}
              onChange={(e) => setJumpSubject(e.target.value as SubjectArea)}
              disabled={availableSubjects.length === 0}
            >
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {SUBJECT_META[s].icon} {SUBJECT_META[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Status</p>
            <div className="flex flex-wrap gap-1">
              {(["all", "correct", "incorrect", "unanswered"] as StatusFilter[]).map((s) => {
                const active = statusFilter === s;
                const label = s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1);
                const activeColor =
                  s === "correct"
                    ? "bg-green-600 text-white border-green-600"
                    : s === "incorrect"
                      ? "bg-amber-500 text-white border-amber-500"
                      : s === "unanswered"
                        ? "bg-gray-500 text-white border-gray-500"
                        : "bg-primary-600 text-white border-primary-600";

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                      active
                        ? activeColor
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              disabled={filtered.length === 0 || activeIndex === 0}
              onClick={() => setActiveIndex((idx) => Math.max(0, idx - 1))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              disabled={filtered.length === 0 || activeIndex >= filtered.length - 1}
              onClick={() => setActiveIndex((idx) => Math.min(filtered.length - 1, idx + 1))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              →
            </button>
            <span className="text-xs text-gray-500">
              {filtered.length === 0 ? "No items" : `${activeIndex + 1} / ${filtered.length}`}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-medium text-gray-500">
              Questions{filtered.length > 0 ? ` (${filtered.length})` : ""}
            </p>

            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400">No questions match.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filtered.map((q, idx) => {
                  const meta = statusMeta(q);
                  const isActive = idx === activeIndex;
                  const flagged = flaggedQuestionIds.has(q._id);
                  const reported = reportedQuestionIds.has(q._id);

                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      title={`Item ${idx + 1} • ${meta.label}${flagged ? " • marked" : ""}${reported ? " • reported" : ""}`}
                      className={`relative inline-flex h-7 min-w-[2rem] items-center justify-center rounded px-1 text-xs font-semibold transition ${
                        isActive
                          ? `ring-2 ring-primary-500 ring-offset-1 ${meta.chip}`
                          : `${meta.chip} opacity-80 hover:opacity-100`
                      }`}
                    >
                      {idx + 1}
                      {flagged && (
                        <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <FlagQuestionModal
        open={Boolean(reportingId)}
        questionId={reportingId}
        onClose={() => setReportingId(null)}
        onSubmitted={() => {
          if (reportingId) markReported(reportingId);
          setReportingId(null);
        }}
      />
    </div>
  );
}

function statusMeta(q: ReviewQ) {
  if (q.userAnswer === null) {
    return {
      label: "unanswered",
      chip: "bg-gray-100 text-gray-600",
      dot: "bg-gray-400",
    };
  }

  if (q.isCorrect) {
    return {
      label: "correct",
      chip: "bg-green-100 text-green-700",
      dot: "bg-green-500",
    };
  }

  return {
    label: "incorrect",
    chip: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  };
}

function QuestionCard({
  q,
  isFlagged,
  isReported,
  onReport,
}: {
  q: ReviewQ;
  isFlagged: boolean;
  isReported: boolean;
  onReport: () => void;
}) {
  const [open, setOpen] = useState(false);

  const meta = SUBJECT_META[q.subjectArea];
  const status =
    q.userAnswer === null ? "unanswered" : q.isCorrect ? "correct" : "incorrect";

  const statusBadge =
    status === "correct"
      ? "bg-green-100 text-green-700"
      : status === "incorrect"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-600";

  const difficultyBadge = {
    easy: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    hard: "bg-primary-50 text-primary-700",
    very_hard: "bg-rose-50 text-rose-700",
  }[q.difficulty];

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">
          Question {q.orderIndex + 1}
        </span>
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
          {meta.icon} {meta.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${difficultyBadge}`}>
          {DIFFICULTY_LABELS[q.difficulty]}
        </span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge}`}>
          {status}
        </span>
        {isFlagged && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Marked in exam
          </span>
        )}
      </header>

      {q.passage && (
        <details className="mb-3 rounded-md border border-amber-200 bg-amber-50/40 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-amber-900">
            {q.passage.title}
          </summary>
          <div className="mt-2 whitespace-pre-line text-amber-950">{q.passage.content}</div>
        </details>
      )}

      <div className="text-gray-900">
        <MathText>{q.questionText}</MathText>
      </div>

      <ul className="mt-4 space-y-2">
        {q.choices.map((c) => {
          const isCorrect = c.label === q.correctAnswer;
          const isUser = c.label === q.userAnswer;

          let cls = "border-gray-200 bg-white text-gray-700";
          let mark: React.ReactNode = null;

          if (isCorrect) {
            cls = "border-green-300 bg-green-50 text-green-800";
            mark = <span className="text-green-600">✓ Correct answer</span>;
          }

          if (isUser && !isCorrect) {
            cls = "border-amber-300 bg-amber-50 text-amber-800";
            mark = <span className="text-amber-600">✗ Your answer</span>;
          } else if (isUser && isCorrect) {
            mark = <span className="text-green-600">✓ Your answer</span>;
          }

          return (
            <li
              key={c.label}
              className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${cls}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-700">
                {c.label}
              </span>
              <span className="flex-1">
                <MathText>{c.text}</MathText>
              </span>
              {mark && <span className="whitespace-nowrap text-xs font-semibold">{mark}</span>}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 text-sm font-medium text-primary-600 hover:underline"
      >
        {open ? "Hide explanation" : "Show explanation"}
      </button>

      {open && (
        <div
          className={`mt-2 rounded-lg p-4 text-sm leading-relaxed ${
            q.isCorrect ? "bg-blue-50 text-blue-900" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          <strong className="mb-1 block">Explanation</strong>
          <MathText>{q.rationale}</MathText>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <AdSlot slot="review_inline" />
        <button
          type="button"
          onClick={onReport}
          disabled={isReported}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReported ? "Issue reported" : "Report a content issue"}
        </button>
      </div>
    </article>
  );
}
