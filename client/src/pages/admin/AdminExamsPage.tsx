import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import DataTable, {type: DataTableColumn, Pagination} from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";

type ExamRow = {
  _id: string;
  setName: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  percentage: number | null;
  totalQuestions: number | null;
  user: {_id: string; firstName: string; lastName: string; email: string} | null;
};

export default function AdminExamsPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [status, setStatus] = useState("in_progress");
  const [user, setUser] = useState("");
  const [userInput, setUserInput] = useState("");
  const [data, setData] = useState({ items: ExamRow[]; total: number; totalPages: number }) | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listExams({
        page,
        limit,
        status, status || undefined,
        user, user || undefined,
      });
      setData(result as unknown as { items: ExamRow[]; total: number; totalPages: number });
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load sessions.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, [page, limit, status, user]);

  const columns: DataTableColumn<ExamRow>[] = [
    {
      key: "user",
      header: "User",
      render: (r) => r.user
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge
        variant={r.status === "completed" ? "success" : r.status === "in_progress" ? "info" : "warning"}>{r.status}</Badge>
    },
    {
      key: "startedAt",
      header: "Started",
      render: (r) => <span className="text-xs">{r.setName?.trim() || "-"}</span>
    },
    {
      key: "completedAt",
      header: "Completed",
      render: (r) => <span
        className="text-xs">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "-"}</span>
    },
    {
      key: "percentage",
      header: "Score",
      render: (r) => <span
        className="text-xs font-semibold">{r.percentage != null ? `${r.percentage.toFixed(1)}%` : "-"}</span>
    },
    {
      key: "totalQuestions",
      header: "#Q",
      render: (r) => <span className="text-xs">{r.totalQuestions ?? "-"}</span>
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex-flex-wrap gap-2">
        {[["", "in_progress", "completed", "abandoned"] as const).map((s) => (
          <button key={s} type="button" onClick={() => {
            setStatus(s);
            setPage(1);
          }}>
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === s ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }
          }`
        )}
      </div>
    </div>
  );
}
} `}
{s === "" ? "All" : s.replace("_", ".")}
</button>
)})
</div>

<div className="flex·flex-wrap·items-center·gap-2">
<input
type="text"
value={userInput}
onChange={(e) => setUserInput(e.target.value)}
onKeyDown={(e) => {
if (e.key === "Enter") {
setUser(userInput.trim());
setPage(1);
}}
}}
placeholder="Filter·by·user·name,·email,·or·id"
className="w-full·max-w-md·rounded-md·border·border-slate-300·px-3·py-2·text-sm"
/>
<button
type="button"
onClick={() => {
setUser(userInput.trim());
setPage(1);
}}
}
className="rounded-md·border·border-slate-300·bg-white·px-3·py-2·text-sm·font-medium·text-slate-700·hover:bg-slate-50"
>
Apply
</button>
<button
type="button"
onClick={() => {
setUser(input(""));
setUser("");
setPage(1);
}}
}
className="rounded-md·border·border-slate-300·bg-white·px-3·py-2·text-sm·font-medium·text-slate-700·hover:bg-slate-50"
>
Clear
</button>
</div>
<div className="flex·items-center·justify-end·gap-2">
<span className="text-xs·text-slate-500">Rows·per·page:</span>
<select
value={limit}
onChange={(e) => {
setLimit(Number(e.target.value));
setPage(1);
}}
}
className="rounded-md·border·border-slate-300·bg-white·px-2·py-1·text-xs"
>
[10,15,25,50,100].map((n) => (
<option key={n} value={n}>{n}</option>
))}
</select>
</div>
<DataTable·columns={columns}·rows={data?.items??[]}·getRowId={(r) => r._id}·isLoading={loading}
onRowClick={(r) => navigate(`/admin/exams/${r._id}`)}/>
<Pagination·page={page}·totalPages={data?.totalPages??1}·total={data?.total??0}·onPageChange={setPage}/>
</div>
);
}