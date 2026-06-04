/**
 * /admin/data-requests -- three-tab view for exports, deletions, and deletion log.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DataRequest, DeletionLogEntry } from "@upcat/shared";
import { adminDataRequestsApi } from "@lib/supportApi";
import { useToastStore } from "@/stores/toastStore";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";

type Tab = "exports" | "deletions" | "log";

export default function AdminDataRequestsPage() {
    const [tab, setTab] = useState<Tab>("exports");

    return (
        <div className="space-y-4 p-6">
            <Seo title="Data requests" noindex/>
            <h1 className="text-2xl font-bold text-gray-900">Data requests</h1>

            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
                <TabBtn active={tab === "exports"} onClick={() => setTab("exports")}>
                    Exports
                </TabBtn>
                <TabBtn active={tab === "deletions"} onClick={() => setTab("deletions")}>
                    Deletions
                </TabBtn>
                <TabBtn active={tab === "log"} onClick={() => setTab("log")}>
                    Deletion log
                </TabBtn>
            </div>
            {tab === "exports" && <RequestsTable type="export"/>}
            {tab === "deletions" && <RequestsTable type="deletion"/>}
            {tab === "log" && <DeletionLog/>}
        </div>
    );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                flex-1 rounded-md px-3 py-1.5 font-medium ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}
            `}
        >
            {children}
        </button>
    );
}

function RequestsTable({ type }: { type: "export" | "deletion" }) {
    const addToast = useToastStore((s) => s.addToast);
    const [data, setData] = useState<{
        requests: (DataRequest & { userEmail?: string; userFullName?: string; })[];
        total: number;
    } | null>(null);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const r = await adminDataRequestsApi.list({ type, status, page: 1, limit: 50 });
            setData({
                requests: Array.isArray(r.requests) ? r.requests : [r],
                total: typeof r.total === "number" ? r.total : 0,
            });
        } finally {
            setLoading(false);
        }
    };

    const requests = data?.requests ?? [];
    useEffect(() => {
        load();
    }, [type, status]);

    const act = async (id: string, action: "cancel" | "expedite") => {
        const label = action === "cancel" ? "Cancel" : "Expedite (delete now)";
        if (!window.confirm(`${label} this request?`)) return;
        try {
            await adminDataRequestsApi.update(id, { action });
            addToast("success", "Request updated.");
            await load();
        } catch (err) {
            const msg =
                (err as { response?: { data?: { error?: string; } } }).response?.data?.error ||
                "Could not update request.";
            addToast("error", msg);
        }
    }
}
return (
    <div className="flex justify-between">
        <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field text-sm"
        >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
        </select>
    </div>
    {loading ? (
        <div className="flex justify-center py-12">
            <Spinner />
        </div>
    ) : requests.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
            No {type} requests match these filters.
        </p>
    ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Requested</th>
                        {type === "deletion" && (
                            <th className="px-3 py-2">Scheduled</th>
                        )}
                        {type === "export" && (
                            <th className="px-3 py-2">Expires</th>
                        )}
                        <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map((r) => (
                        <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2">
                                <p className="font-medium">
                                    {r.userFullName ?? "-"}
                                </p>
                                <span className="text-xs text-gray-500">
                                    {r.userEmail ?? ""}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-xs">{r.status}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                                {new Date(r.requestedAt).toLocaleString()}
                            </td>
                            {type === "deletion" && (
                                <td className="px-3 py-2 text-xs text-gray-500">
                                    {r.deletion?.scheduledFor
                                        ? new Date(r.deletion.scheduledFor).toLocaleString()
                                        : "--"}
                                </td>
                            )}
                            {type === "export" && (
                                <td className="px-3 py-2 text-xs text-gray-500">
                                    {r.export?.expiresAt
                                        ? new Date(r.export.expiresAt).toLocaleString()
                                        : "--"}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )}
</div>
function DeletionLog() {
    const [emailHash, setEmailHash] = useState("");
    const [data, setData] = useState<({ entries: DeletionLogEntry[]; total: number } | null)>();
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const r = await adminDataRequestsApi.deletionLog({
                emailHash: emailHash.trim() || undefined,
                page: 1,
                limit: 100,
            });
            setData({
                entries: Array.isArray(r.entries) ? r.entries : [],
                total: typeof r.total === "number" ? r.total : 0,
            });
        } finally {
            setLoading(false);
        }
    };

    const entries = data?.entries ?? [];

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex gap-2">
            <input
                placeholder="Filter by emailHash (SHA-256 hex...)"
                value={emailHash}
                onChange={(e) => setEmailHash(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                className="input-field text-sm font-mono"
            />
            <button onClick={load} className="btn-primary text-xs">
                Search
            </button>
        </div>
        {loading ? (
            <div className="flex justify-center py-12">
                <Spinner />
            </div>
        ) : entries.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
                No log entries.
            </p>
        ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2">Original user</th>
                            <th className="px-3 py-2">Email hash</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Executed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e) => (
                            <tr key={e.id} className="border-t border-gray-100">
                                <td className="px-3 py-2 font-mono text-xs">{e.originalUserId}</td>
                                <td className="px-3 py-2 font-mono text-xs">{e.emailHash.slice(0, 12)}</td>
                                <td className="px-3 py-2 text-xs">{e.deletionType}</td>
                                <td className="px-3 py-2 text-xs text-gray-500">
                                    {(new Date(
                                        ((e as any).executedAt ?? (e as any).deletedAt) as string,
                                    ).toLocaleString())}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    );
}