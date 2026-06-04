import { useEffect, useState } from "react";
import DataTable, { type DataTableColumn, Pagination } from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import Modal from "@/components/Modal";
import MathText from "@/components/MathText";
import { adminApi } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";
import { type Difficulty, DIFFICULTY_LABELS, FLAG_REASONS } from "@upcat/shared";

type FlagRow = {
    _id: string;
    reason: string;
    comment: string;
    status: string;
    createdAt: string;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
    question: { _id: string; subjectArea: string; difficulty: string; preview: string; correctAnswer: string } | null;
    user: { _id: string; firstName: string; lastName: string; email: string } | null;
};

const REASON_LABEL: Record<string, string> = Object.fromEntries(FLAG_REASONS.map((r) => [r.value, r.label]));

export default function AdminContentFlagsPage() {
    const addToast = useToastStore((s) => s.addToast);
    const [status, setStatus] = useState<"open" | "resolved" | "dismissed" | "">("open");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<{ items: FlagRow[]; total: number; totalPages: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState<FlagRow | null>(null);
    const [resolutionNote, setResolutionNote] = useState("");

    const refresh = async () => {
        setLoading(true);
        try {
            const result = await adminApi.listFlags({ status: status || undefined, page, limit: 20 });
            setData(result as unknown as { items: FlagRow[]; total: number; totalPages: number });
        } catch (e) {
            const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
            addToast("error", msg ?? "Could not load flags.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh(); /*eslint-disable-line */
    }, [status, page]);

    const updateFlag = async (id: string, nextStatus: "resolved" | "dismissed") => {
        try {
            await adminApi.updateFlag(id, { status: nextStatus, resolutionNote: resolutionNote.trim() || undefined });
            addToast("success", `Flag ${nextStatus}.`);
            setActive(null);
            setResolutionNote("");
            refresh();
        } catch (e) {
            const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
            addToast("error", msg ?? "Update failed.");
        }
    };

    const columns: DataTableColumn<FlagRow>[] = [
        {
            key: "question",
            header: "Question",
            render: (r) => (
                <div className="min-w-0">
                    <p className="line-clamp-2 font-medium text-slate-800">{r.question?.preview ?? "-"}</p>
                    <p className="text-xs text-slate-500">{r.question?.subjectArea} {r.question?.difficulty ? (DIFFICULTY_LABELS[r.question.difficulty as Difficulty] ?? r.question.difficulty) : "-"}</p>
                </div>
            ),
        },
        {
            key: "reason",
            header: "Reason",
            render: (r) => <Badge variant="warning">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
        },
        {
            key: "comment",
            header: "Comment",
            render: (r) => <p className="line-clamp-2 text-xs text-slate-600">{r.comment || "-"}</p>
        },
        {
            key: "user",
            header: "Reported by",
            render: (r) => r.user ? <span className="text-xs">{r.user.firstName} {r.user.lastName}</span> : <span className="text-xs text-slate-400">deleted</span>,
        },
        {
            key: "createdAt",
            header: "When",
            render: (r) => <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
        },
        {
            key: "status",
            header: "Status",
            render: (r) => (
                <Badge
                    variant={r.status === "open" ? "warning" : r.status === "resolved" ? "success" : "neutral"}
                >{r.status}</Badge>
            ),
        },
    ];
}
{
    key: "actions",
    header: "",
    className: "text-right",
    render: (r) => (
        <button type="button" onClick={() => {
            setActive(r);
            setResolutionNote(r.resolutionNote ?? "");
        }} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Review</button>
    ),
};

return (
    <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
            {(["open", "resolved", "dismissed", ""].as const).map((s) => (
                <button key={s} type="button" onClick={() => {
                    setStatus(s);
                    setPage(1);
                }} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${status === s ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"} ${s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}`}> </button>
            ))}
        </div>
        <DataTable columns={columns} rows={data?.items ?? []} getRowId={(r) => r._id} isLoading={loading}/>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPageChange={setPage}/>

        <Modal isOpen={active !== null} onClose={() => {
            setActive(null);
            setResolutionNote("");
        }} title="Review flag" size="lg">
            {active && active.status === "open" ? (
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => updateFlag(active._id, "dismissed")}>Dismiss</button>
                    <button type="button" onClick={() => updateFlag(active._id, "resolved")}>Mark resolved</button>
                </div>
            ) : (
                <button type="button" onClick={() => {
                    setActive(null);
                    setResolutionNote("");
                }} className="rounded-md border-slate-200 px-3 py-1.5 text-sm">Close</button>
            )}
        </Modal>
    </div>
);
}