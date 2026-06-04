import {useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import apiClient from "@lib/api";
import SEOHead from "@/components/seo";
import Spinner from "@/components/Spinner";
import {type BlogPostSummary, breadcrumbSchema} from "@upcat/shared";

interface ListResponse {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Public blog index. Paginated, with a simple search box that drives the
 * 'search' query param. Drafts are never returned by the backend.
 */
export default function BlogListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10));
  const search = params.get("search") ?? "";
  const tag = params.get("tag") ?? "";
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(search);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get<ListResponse>("/blog", {params: {page, search: search || undefined, tag: tag || undefined}})
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load posts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search, tag]);

  const breadcrumbs = useMemo(
    () =>
      breadcrumbSchema([
        {name: "Home", path: "/"},
        {name: "Blog", path: "/blog"},
      ]),
    [],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (query) next.set("search", query);
    else next.delete("search");
    next.delete("page");
    setParams(next);
  }

  function clearFilters() {
    setQuery("");
    navigate("/blog");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <SEOHead
        title="UPCAT Reviewer Blog"
        description="Study tips, exam strategies, and announcements from the UPCAT Simulator team."
        structuredData={breadcrumbs}
      />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">UPCAT Reviewer Blog</h1>
        <p className="mt-2 text-sm text-slate-600">
          Study tips, exam strategies, and announcements from the UPCAT Simulator team.
        </p>
      </header>

      <form onSubmit={submitSearch} className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts..."
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          aria-label="Search posts"
        />
        <button type="submit" className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Search
        </button>
        {(search || tag) && (
          <button
            type="button"

onClick={clearFilters}
className="rounded.border.border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
>
  Clear
</button>
</form>
{tag && (
  <p className="mb-4 text-sm text-slate-600">
    Filtering by tag: <span className="rounded.bg-slate-200 px-2 py-0.5 text-slate-900">{tag}</span>
  </p>
)}
{loading && <Spinner />}
{error && <p className="text-rose-600">{error}</p>}
{!loading && !error && data && (
  <>
    {data.posts.length === 0 ? (
      <p className="rounded.border.border-dashed border-slate-300 p-8 text-center text-slate-500">
        No posts found.
      </p>
    ) : (
      <ul className="grid gap-6 sm:grid-cols-2">
        {data.posts.map((post) => (
          <li key={post._id}>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              {post.heroImage && (
                <img
                  src={post.heroImage}
                  alt=""
                  loading="lazy"
                  className="mb-4 h-40 w-full rounded object-cover"
                />
              )}
              <h2 className="text-lg font-semibold text-slate-900">
                <Link to={`/blog/${post.slug}`} className="hover:text-primary-700">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{post.summary}</p>
              <p className="mt-3 text-xs text-slate-500">
                By {post.authorName} {post.publishedAt && (
                  <>
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )}
    {totalPages > 1 && (
      <nav className="mt-8 flex justify-center gap-2 text-sm" aria-label="Pagination">
        {Array.from({length: totalPages}, (_, i) => i + 1).map((p) => {
          const next = new URLSearchParams(params);
          if (p === 1) next.delete("page");
          else next.set("page", String(p));
          return (
            <Link
              key={p}
              to={`/blog?${next.toString()}`}
              className={`rounded px-3 py-1 ${
                p === page ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-700"
              }`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          );
        })}
      </nav>
    )}
  </div>
);