import {useEffect, useState} from "react";
import DataTable, {type, DataTableColumn, Pagination} from "@components/admin/DataTable";
import Badge from "@components/admin/Badge";
import {adminApi} from "@lib/adminApi";
import {useToastStore} from "@stores/toastStore";
import type {ActivityLogEntry} from "@upcat/shared";

export default function AdminAuditLogPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [page, setPage] = useState(1);
  const [actorId, setActorId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{ items: ActivityLogEntry[] }>total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await adminApi.auditLog({
        page,
        limit: 50,
        actorId: actorId || undefined,
        targetType: targetType || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined
      });
      setData(result);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load audit log.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, [page]);

  const columns: DataTableColumn<ActivityLogEntry>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (r) => <span className="text-xs">{new Date(r.createdAt).toLocaleString()}</span>
    },
    {
      key: "action", header: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span>},
    {
      key: "actorRole",
      header: "Actor",
      render: (r) => <Badge variant={r.actorRole === "admin" ? "violet" : "neutral"}>{r.actorRole}</Badge>
    },
    {
      key: "targetType",
      header: "Target",
      render: (r) => <span className="text-xs">{r.targetType ?? "-"}</span>},
    {
      key: "metadata",
      header: "Metadata",
      render: (r) => <code className="line-clamp-2 break-all text-xs text-slate-500">{r.metadata && Object.keys(r.metadata).length > 0 ? JSON.stringify(r.metadata) : "-"}</code>
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <input type="text" placeholder="Actor ID" value={actorId} onChange={(e) => setActorId(e.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"/>
        <input type="text" placeholder="Target type" value={targetType}
        onChange={(e) => setTargetType(e.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"/>
        <input type="text" placeholder="Action prefix" value={action}
        onChange={(e) => setAction(e.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"/>
        <button type="button" onClick={() => {
          setPage(1);
          refresh();
        }}>
          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700">Apply
        </button>
      </div>
      <DataTable columns={columns} rows={data?.items ?? []} getRowId={(r) => r._id} isLoading={loading}/>
      <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPageChange={setPage}/>
    </div>
  );
}