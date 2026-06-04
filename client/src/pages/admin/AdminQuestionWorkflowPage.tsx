import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";
import { useSetFilter } from "@/hooks/useSetFilter";
import type { AdminQuestionListEntry, QuestionPublicationStatus } from "@upcat/shared";

const WORKFLOW_TRANSITIONS: Record<QuestionPublicationStatus, QuestionPublicationStatus[]> = {
  draft: ["in_review", "published", "archived"],
  in_review: ["draft", "published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft", "in_review"],
};

function normalizePublicationStatus(status: string | null | undefined): QuestionPublicationStatus {
  if (status === "draft" || status === "in_review" || status === "published" || status === "archived") {
    return status;
  }
  return "draft";
}

function canTransition(from: QuestionPublicationStatus, to: QuestionPublicationStatus): boolean {
  if (from === to) return false;
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

export default function AdminQuestionWorkflowPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminQuestionListEntry[]>([]);
  const [filter, setFilter] = useState<"" | QuestionPublicationStatus>("");
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [setOptions, setSelectedSetId, setSelectedSetId] = useSetFilter();

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listQuestions({
        limit: 100,
        includeDeleted: false,
        setId: selectedSetId || undefined,
        publicationStatus: filter || undefined,
        sortBy: "updatedat",
        sortOrder: "desc",
      });
      setRows(result.items);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load workflow queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedSetId]);

  const transition = async (row: AdminQuestionListEntry, status: QuestionPublicationStatus) => {
    const currentState = normalizePublicationStatus(row.publicationStatus);
    if (!canTransition(currentState, status)) {
      addToast("info", `Cannot transition from ${currentState} to ${status}`);
      return;
    }
    setTransitioningId(row._id);
    try {
      await adminApi.transitionQuestionWorkflow(row._id, status);
      addToast("success", `Question moved to ${status}`);
      refresh();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Workflow transition failed.");
    } finally {
      setTransitioningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Publishing Workflow</h2>
            <p className="text-sm text-slate-600">Review draft and in-review questions, then publish or archive.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              required
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {setOptions.length === 0 ? (
                <option value="">No sets</option>
              ) : (
                setOptions.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))
              )}
            </select>
            <select
value={filter}
onChange={(e) => setFilter(e.target.value as "" | QuestionPublicationStatus)}
className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
>
    <option value="">all statuses</option>
    <option value="draft">Draft</option>
    <option value="in_review">In review</option>
    <option value="published">Published</option>
    <option value="archived">Archived</option>
</select>
</div>
</div>
<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
<table className="min-w-full divide-y divide-slate-200 text-sm">
    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>
            <th className="px-3 py-2">Question</th>
            <th className="px-3 py-2">Subject</th>
            <th className="px-3 py-2">$Status</th>
            <th className="px-3 py-2">Version</th>
            <th className="px-3 py-2 text-right">Actions</th>
        </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
        {loading && (
            <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={5}>Loading workflow queue...</td>
            </tr>
        )}
        {loading && rows.length === 0 && (
            <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={5}>No questions match the current filter.</td>
            </tr>
        )}
        {loading && rows.map((row) => (
            <tr key={row._id}>
                {() => {
                    const currentStatus = normalizePublicationStatus(row.publicationStatus);
                    const isBusy = transitioningId === row.id;
                    const canMoveToReview = canTransition(currentStatus, "in_review");
                    const canMoveToPublished = canTransition(currentStatus, "published");
                    const canMoveToArchived = canTransition(currentStatus, "archived");
                    return (
                        <>
                            <td className="px-3 py-2">
                                <Link to={`/admin/questions/${row.id}`} className="font-medium text-slate-800 hover:text-primary-700">{row.questionTextPreview}</Link>
                            </td>
                            <td className="px-3 py-2">{row.subjectArea}</td>
                            <td className="px-3 py-2">{row.publicationStatus ?? "draft"}</td>
                            <td className="px-3 py-2">{row.version ?? 1}</td>
                            <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-1">
                                    <button type="button" onClick={() => transition(row, "in_review")} disabled={isBusy || !canMoveToReview} className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                                        Review
                                    </button>
                                    <button type="button" onClick={() => transition(row, "published")} disabled={isBusy || !canMoveToPublished} className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                                        Publish
                                    </button>
                                    <button type="button" onClick={() => transition(row, "archived")} disabled={isBusy || !canMoveToArchived} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                        Archive
                                    </button>
                                </div>
                            </td>
                        </>
                    );
                }}
            </tr>
        ))}
    </tbody>
</table>
</div>
</div>