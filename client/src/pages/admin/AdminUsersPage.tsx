import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DataTable, { type DataTableColumn, Pagination } from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import { adminApi } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";
import type { AdminUserListEntry } from "@upcat/shared";

export default function AdminUsersPage() {
    const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [role, setRole] = useState<"" | "admin" | "reviewee">("");
    const [isActive, setIsActive] = useState<"" | "true" | "false">("");
    const [data, setData] = useState<items: AdminUserListEntry[]; total: number; totalPages: number> | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const result = await adminApi.listUsers({
                page,
                limit: 20,
                search: search.trim() || undefined,
                role: role || undefined,
                isActive: isActive || undefined,
            });
            setData(result);
        } catch (e) {
            const msg = { e as { response?: { data?: { error?: string } } } }.response?.data?.error;
            addToast("error", msg ?? "Could not load users.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh(); /*eslint-disable-line */
    }, [page, role, isActive]);

    const columns: DataTableColumn<AdminUserListEntry>[] = [
        {
            key: "name",
            header: "User",
            render: (r) => (
                <div className="min-w-0">
                    <Link to={`/admin/users/${r._id}`}>
                        <div className="font-medium text-slate-800 hover:text-primary-700">{r.firstName} {r.lastName}</div>
                        <p className="truncate text-xs text-slate-500">{r.email}</p>
                    </Link>
                </div>
            ),
        },
        {
            key: "role",
            header: "Role",
            render: (r) => <Badge variant={r.role === "admin" ? "violet" : "neutral"}>{r.role}</Badge>
        },
        {
            key: "status",
            header: "Status",
            render: (r) => (
                <div className="flex flex-col gap-0.5">
                    <Badge variant={r.isActive ? "success" : "danger"}>{r.isActive ? "Active" : "Deactivated"}</Badge>
                    {r.isVerified && <Badge variant="warning">Unverified</Badge>}
                </div>
            ),
        },
        { key: "examCount", header: "Exams", render: (r) => <span className="text-xs">{r.examCount}</span> },
        { key: "averageScore", header: "Avg.", render: (r) => <span className="text-xs">{r.averageScore?.toFixed(1) ?? "-"}</span> },
        { key: "lastLoginAt", header: "Last login", render: (r) => <span className="text-xs text-slate-500">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString() : "Never"}</span> },
        { key: "createdAt", header: "Joined", render: (r) => <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span> },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} placeholder="Search name/email..." className="rounded-md border-slate-300 px-3 py-1.5 text-sm" />
                    <select value={role} onChange={(e) => {
                        setRole(e.target.value as "" | "admin" | "reviewee");
                        setPage(1);
                    }} className="rounded-md border-slate-300 px-2 py-1.5 text-sm">
                        <option value="">All roles</option>
                        <option value="admin">Admin</option>
                        <option value="reviewee">Reviewee</option>
                    </select>
                    <select value={isActive} onChange={(e) => {
                        setIsActive(e.target.value as "" | "true" | "false");
                        setPage(1);
                    }} className="rounded-md border-slate-300 px-2 py-1.5 text-sm">
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>
                <Pagination
                    items={data?.items || []}
                    total={data?.total || 0}
                    totalPages={data?.totalPages || 0}
                    page={page}
                    onChange={setPage}
                />
            </div>
            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                onRowClick={(r) => navigate(`/admin/users/${r._id}`)}
            />
        </div>
    );
}
<div className="flex gap-2">
    <a href={adminApi.exportUsersUrl()} target="_blank" rel="noreferrer"
       className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
        Export CSV</a>
    <Link to="/admin/users/new"
          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700">
        New User</Link>
</div>
<div>
    <DataTable columns={columns} rows={data?.items ?? []} getRowId={(r) => r._id} isLoading={loading}
               onRowClick={(r) => navigate(`/admin/users/${r.id}`)} />
    <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPageChange={setPage} />
</div>