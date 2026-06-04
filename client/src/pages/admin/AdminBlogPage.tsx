import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "@/components/Spinner";
import adminApi from "@/lib/adminApi";
import useToastStore from "@/stores/toastStore";
import type { BlogPostSummary, BlogStatus } from "@upcat/shared";

export default function AdminBlogPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [items, setItems] = useState<BlogPostSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BlogStatus | "any">("any");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listBlogPosts({ page, status: filter });
      setItems(res.items);
      setTotal(res.total);
      setPageSize(res.pageSize);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load blog posts.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete blog post "${title}"? This is permanent.`)) return;
    try {
      await adminApi.deleteBlogPost(id);
      addToast("success", "Post deleted.");
      await load();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Delete failed.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select value={filter} onChange={(e) => {
            setPage(1);
            setFilter(e.target.value as BlogStatus | "any");
          }}>
            <option value="any">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <Link to="/admin/blog/new" className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">
          + New post
        </Link>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                    No posts.
                  </td>
                </tr>
              )}
              {((items ?? []).map((p) => {
                const isPublished = Boolean(p.publishedAt);
                return (
                  <tr key={p._id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-800">{p.title}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{p.slug}</td>
                    <td className="px-3 py-2">
{isPublished ? (
    <span
        className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        Published
    </span>
) : (
    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
        Draft
    </span>
)}
</td>
<td className="px-3 py-2 text-xs text-slate-500">
    {(new Date(p.updatedAt).toLocaleDateString())}
</td>
<td className="px-3 py-2 text-right">
    <Link to={`/admin/blog/${p.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50">
        Edit
    </Link>
<button type="button" onClick={() => remove(p._id, p.title)} className="ml-2 rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50">
    Delete
</button>
</td>
</tr>;
})}
</tbody>
</table>
</div>

<div className="flex items-center justify-between text-sm">
<span className="text-slate-500">{total} post{total === 1 ? "" : "s"} {page} of {totalPages}</span>
<div className="flex gap-1">
<button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50">Prev</button>
<button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50">Next</button>
</div>
</div>
</div>;
}