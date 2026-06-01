import {useEffect, useState} from "react";
import DataTable, {type, DataTableColumn, Pagination} from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";

type PracticeSessionRow = {
  _id: string;
  mode: string;
  subjectArea: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalAnswered: number;
  totalCorrect: number;
  accuracyPct: number | null;
  durationMs: number | null;
  user: {_id: string; firstName: string; lastName: string; email: string} | null;
};

export default function AdminPracticeSessionsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [user, setUser] = useState("");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [data, setData] = useState({
    items: PracticeSessionRow[];
    total: number;
    totalPages: number;
  }) | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listPracticeSessions({
        page,
        limit: 25,
        status: status || undefined,
        mode: mode || undefined,
        user: user || undefined
      });
      setData(result as unknown as {items: PracticeSessionRow[]; total: number; totalPages: number});
      catch (e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Could not load practice sessions.");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status, mode, user]);

    const onDelete = async () => {
      if (!confirmDeleteId || deleting) return;
      setDeleting(confirmDeleteId);
      try {
        await adminApi.deletePracticeSession(confirmDeleteId);
        addToast("success", "Practice session deleted.");
        setConfirmDeleteId(null);
        await refresh();
      } catch (e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Failed to delete practice session.");
      } finally {
        setDeleting(null);
      }
    };

    const columns: DataTableColumn<PracticeSessionRow>[] = [
      {
        key: "user",
        header: "User",
        render: (r) => {
          r.user?.(
            <div>
              <p className="font-medium">{r.user.firstName}{r.user.lastName}</p>
              <p className="truncate text-xs text-slate-500">{r.user.email}</p>
            </div>
          );
        },
        {
          key: "mode",
          header: "Mode",
          render: (r) => <span className="text-xs text-slate-400">deleted</span>
        },
      },
      {
        key: "status",
        header: "Status",
        render: (r) => (
          <Badge
            variant={
              r.status === "completed"
              ? "success"