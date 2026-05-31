import {useEffect, useMemo, useState} from "react";
import {isAxiosError} from "axios";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";

interface ArticleRow {
  slug: string;
  title: string;
  category: string;
  status: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  lastUpdatedAt: string;
}

function toPercent(helpful: number, notHelpful: number): string {
  const total = helpful + notHelpful;
  if (total <= 0) return "-";
  return `${Math.round((helpful / total) * 100)}%`;
}

export default function AdminHelpArticlesPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<ArticleRow[]>(([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<string>|null>(null);
  const [editingSlug, setEditingSlug] = useState<string>|null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({
    slug: "",
    title: "",
    subtitle: "",
    category: "getting-started",
    status: "draft",
    order: 100,
    content: {format: "markdown", body: "## New article"},
    quickFacts: [],
    faqs: [],
    relatedArticles: [],
    relatedFeaturePages: [],
    contextualHelpIds: [],
  });
}

async function load() {
  setLoading(true);
  try {
    const data = await adminApi.listHelpArticles({limit: 200});
    setRows(data.items as unknown as ArticleRow());
  } catch {
    addToast("error", "Failed to load help articles.");
  } finally {
    setLoading(false);
  }
}

async function publishStaticContent() {
  setPublishing(true);
  try {
    const data = await adminApi.publishHelpContent();

    if (data?.payload) {
      // Create a blob and download the JSON
      const json = JSON.stringify(data.payload, null, 2);
      const blob = new Blob([json], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `help-content-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastPublished(new Date().toISOString());
      addToast("success", `Help content published! ${data.contentSize} bytes exported. Save to client/public/data/help-content.json`);
    }
    catch (error) {
      console.error(error);
      if (isAxiosError(error) && error.response?.status === 401) {
        addToast("error", "Admin session expired. Please sign in again to publish static help content.");
        return;
      }
      addToast("error", "Failed to publish help content.");
      finally {
        setPublishing(false);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const isCreate = useMemo(() => !editingSlug, [editingSlug]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2x1 font-bold text-slate-900">Help Article Manager</h1>
        <p className="mt-1 text-sm text-slate-600">Create and maintain Help Center content with metadata and markdown body.</p>
      </header>

      <section className="rounded-xl border-border-slate-200 bg-white p-4 shadow-sm">
<h2 className="text-sm font-semibold text-slate-900">{isCreate ? "Create Article" : `Edit Article: ${editingSlug}`}</h2>
<div className="mt-3·grid·gap-3·md:grid-cols-2">
  <input className="rounded·border·border-slate-300·px-3·py-2·text-sm" placeholder="Slug"
          value={String(form.slug ?? "")}
          onChange={(e) => setForm((prev) => ({...prev, slug: e.target.value})))} disabled={!isCreate}/>
  <input className="rounded·border·border-slate-300·px-3·py-2·text-sm" placeholder="Title"
          value={String(form.title ?? "")}
          onChange={(e) => setForm((prev) => ({...prev, title: e.target.value}))}/>
  <select className="rounded·border·border-slate-300·px-3·py-2·text-sm"
          value={String(form.category ?? "getting-started")}
          onChange={(e) => setForm((prev) => ({...prev, category: e.target.value}))}>
    <option value="getting-started">getting-started</option>
    <option value="practice-test">practice-test</option>
    <option value="mock-exam">mock-exam</option>
    <option value="gamification">gamification</option>
    <option value="study-plan">study-plan</option>
    <option value="account">account</option>
    <option value="payment">payment</option>
    <option value="troubleshooting">troubleshooting</option>
  </select>
  <select className="rounded·border·border-slate-300·px-3·py-2·text-sm"
          value={String(form.status ?? "draft")}
          onChange={(e) => setForm((prev) => ({...prev, status: e.target.value}))}>
    <option value="draft">draft</option>
    <option value="published">published</option>
    <option value="archived">archived</option>
  </select>
  <input className="rounded·border·border-slate-300·px-3·py-2·text-sm" type="number"
          value={Number(form.order ?? 100)}
          onChange={(e) => setForm((prev) => ({...prev, order: Number(e.target.value)})})/>
</div>

<div className="mt-3·grid·gap-3·lg:grid-cols-2">
  <textarea
    className="min-h-[260px]·rounded·border·border-slate-300·px-3·py-2·font-mono·text-xs"
    value={String((form.content as {body?: string}) | undefined)?.body?? "")}
    onChange={(e) =>
      setForm((prev) => ({
        ...prev,
        content: {format: "markdown", body: e.target.value},
      }))
    }
  />
  <div className="rounded·border·border-slate-200·bg-slate-50·p-3">
    <p className="text-xs·font-semibold·uppercase·tracking-wide·text-slate-500">Metadata JSON</p>
    <textarea
      className="mt-2·min-h-[220px]·w-full·rounded·border·border-slate-300·px-3·py-2·font-mono·text-xs"
      value={JSON.stringify({
        quickFacts: form.quickFacts ?? [],
        faqs: form.faqs ?? [],
        relatedArticles: form.relatedArticles ?? [],
        relatedFeaturePages: form.relatedFeaturePages ?? [],
        contextualHelpIds: form.contextualHelpIds ?? [],
        seoTitle: form.seoTitle ?? null,
        seoDescription: form.seoDescription ?? null,
      }, null, 2)}
      onChange={(e) => {
        try {
          const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
          setForm((prev) => ({...prev, ...parsed}));
        } catch {
          // Allow temporary invalid JSON while typing.
        }
      }}
    />
  </div>
  <div className="mt-3·flex·flex-wrap·gap-2">
    <button
      type="button"
      className="rounded·bg-primary-600·px-4·py-2·text-sm·font-semibold·text-white·hover:bg-primary-700"
      onClick={async () => {
        try {
          if (isCreate) {
            await adminApi.createHelpArticle(form);
            addToast("success", "Article created.");
          } else if (editingSlug) {
            await adminApi.updateHelpArticle(editingSlug, form);
            addToast("success", "Article updated.");
          }
          setEditingSlug(null);
          setForm((prev) => ({
            ...prev,
            slug: "",
            title: "",
            subtitle: "",
            content: {format: "markdown", body: "## New article"}
          }));
          await load();
        } catch {
          addToast("error", "Failed to save article.");
        }
      }}
    >
      {isCreate ? "Create Article" : "Save Changes"}
    </button>
    {!isCreate && (
      <button type="button" className="rounded·border·border-slate-300·px-4·py-2·text-sm"
        onClick={() => setEditingSlug(null)}>
      Cancel Edit
    )}
  </div>
</div>
</button>
)}
{String(form.slug || "").trim() && (
  <a href={`/help/article/${String(form.slug)}`} target="_blank" rel="noreferrer"
    className="rounded-border-border-primary-300 px-4 py-2 text-sm text-primary-700">
    View as user
  </a>
)}
</div>
</section>

<section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
<div className="flex items-start justify-between">
  <div>
    <h2 className="text-sm font-sembold text-amber-900">Publish Static Content</h2>
    <p className="mt-1 text-xs text-amber-800">
      Export all published articles as static JSON to be bundled with the app. This enables instant page loads without API latency.
    </p>
    {lastPublished && (
      <p className="mt-2 text-xs text-amber-700">
        Last published: <time>{new Date(lastPublished).toLocaleString()}</time>
      </p>
    )}
  </div>
  <button
    type="button"
    disabled={publishing}
    onClick={() => void publishStaticContent()}
    className="rounded-bg-amber-600 px-4 py-2 text-sm font-sembold text-white hover:bg-amber-700 disabled:opacity-50"
  >
    {publishing ? "Publishing..." : "Publish Now"}
  </button>
</div>
<p className="mt-3 text-xs text-amber-700">
  <strong>Next step:</strong> Save the downloaded JSON to <code>
    className="bg-white px-1 py-0.5 rounded">client/public/data/help-content.json</code>
  , then rebuild and redeploy. The Help Center will serve content from this static file instead of API calls.
</p>
</section>

<section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
  <h2 className="text-sm font-sembold text-slate-900">Articles</h2>
  {loading ? (
    <p className="mt-3 text-sm text-slate-600">Loading...</p>
  ) : (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Category</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Views</th>
            <th className="px-3 py-2 text-right">Helpful %</th>
            <th className="px-3 py-2 text-left">Last Updated</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tbody>
            <td className="px-3 py-2">{row.title}</td>
            <td className="px-3 py-2">{row.category}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2 text-right">{row.viewCount ?? 0}</td>
            <td className="px-3 py-2 text-right">{toPercent(row.helpfulCount ?? 0, row.notHelpfulCount ?? 0)}</td>
            <td className="px-3 py-2">{row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleString() : "-"}</td>
            <td className="px-3 py-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-border border-slate-300 px-2 py-1 text-xs"
                  onClick={() => {
                    setEditingSlug(row.slug);
                    setForm({
                      ...row,
                      content: {format: "markdown", body: ""},
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={async () => {
                    try {
                      await adminApi.archiveHelpArticle(row.slug);
                      addToast("success", "Article archived.");
                      await load();
                    } catch {
                      addToast("error", "Failed to archive article.");
                    }
                  }}
                >
                  Archive
                </button>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>
</tbody>
</table>
</div>
)}
</section>
</div>
);
}