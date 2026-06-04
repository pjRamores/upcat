import { useState } from "react";
import Modal from "@/components/Modal";
import { FLAG_REASONS } from "@upcat/shared";
import { publicApi } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";

interface Props {
    isOpen: boolean;
    questionId: string | null;
    onSubmit?: (questionId: string) => void;
    onClose: () => void;
}

export default function FlagQuestionModal({ isOpen, questionId, onSubmit, onClose }: Props) {
    const [reason, setReason] = useState<string>("incorrect_answer");
    const [comment, setComment] = useState("");
    const [busy, setBusy] = useState(false);
    const addToast = useToastStore((s) => s.addToast);

    const submit = async () => {
        if (!questionId) return;
        setBusy(true);
        try {
            await publicApi.flagQuestion(questionId, { reason, comment: comment.trim() || undefined });
            addToast("success", "Thanks -- your report was submitted.");
            onSubmit?.(questionId);
            setReason("incorrect_answer");
            setComment("");
            onClose();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
            addToast("error", msg ?? "Could not submit your report.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Report this question" description="Help us improve content quality." footer={
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
                <button type="button" disabled={busy || !questionId} onClick={submit} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{busy ? "Sending..." : "Submit report"}</button>
            </div>
        }>
            <fieldset className="space-y-3">
                <legend className="sr-only">Reason for reporting</legend>
                {FLAG_REASONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="flag-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                        {r.label}
                    </label>
                ))}
            </fieldset>
            <label className="mt-4 block">
                <span className="text-xs font-medium text-slate-600">Additional comments (optional)</span>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </label>
        </Modal>
    );
}