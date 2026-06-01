import {useEffect, useState} from "react";
import {isAxiosError} from "axios";
import Spinner from "@/components/Spinner";
import {adminApi, type SeoOverridePageRow, type SitemapStatus,} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import type {SeoOverride, UrlRedirect} from "@upcat/shared";

type Tab = "overrides" | "redirects" | "sitemap";

/**
 * Admin SEO console: per-page metadata overrides, URL redirects (301/302),
 * and a read-only sitemap status pane.
 */
export default function AdminSeoPage() {
  const [tab, setTab] = useState<Tab>("overrides");

  return (
    <div className="space-y-5">
      <nav className="flex gap-2 border-b border-slate-200">
        {[["overrides", "redirects", "sitemap"] as const].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize ${
              tab === t
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "overrides" && <OverridesPanel/>}
      {tab === "redirects" && <RedirectsPanel/>}
      {tab === "sitemap" && <SitemapPanel/>}
    </div>
  );
}

/* --- Overrides --- */


function OverridesPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<SeoOverridePageRow[] | null>(null);
  const [editing, setEditing] = useState<SeoOverridePageRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listSeoOverrides();
      setRows(data.pages);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load overrides.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (path: string) => {
    if (!confirm(`Remove SEO override for ${path}?`)) return;
    try {
      await adminApi.deleteSeoOverride(path);
      addToast("success", "Override removed.");
      await load();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Delete failed.");
    }
  };

  const publishStaticOverrides = async () => {
    setPublishing(true);
    try {
      const data = await adminApi.publishSeoOverrides();
      if (data?.payload) {
        const json = JSON.stringify(data.payload, null, 2);
        const blob = new Blob([json], { type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `seo-overrides-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setLastPublished(new Date().toISOString());
        addToast("success", `SEO overrides published! ${data.contentSize} bytes. Save to client/public/data/seo-overrides.json`);
      }
    } catch (err) {
      console.error(err);
    }
    if (isAxiosError(err) && err.response?.status === 401) {
      addToast("error", "Admin session expired. Please sign in again.");
      return;
    }
  };
}
}
addToast("error", "Failed to publish SEO overrides.");
finally {
setPublishing(false);
}
};

if (loading) return <Spinner/>;
if (!rows) return null;

return (
<div className="space-y-4">
<section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
<div className="flex items-start justify-between">
<div>
<h2 className="text-sm font-semibold text-amber-900">Publish Static SEO Overrides</h2>
<p className="mt-1 text-xs text-amber-800">
Export all overrides as a static JSON snapshot. The app loads this file instead of calling the API on every page, eliminating per-page/api/seo/page-meta requests.
</p>
{lastPublished && (
<p className="mt-1 text-xs text-amber-700">
Last published: <time>{new Date(lastPublished).toLocaleString()}</time>
</p>
)}
</div>
<button
type="button"
disabled={publishing}
onClick={() => void publishStaticOverrides()}
className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
>
{publishing ? "Publishing..." : "Publish Now"}
</button>
</div>
<p className="mt-2 text-xs text-amber-700">
<strong>Next step:</strong> Save the downloaded JSON to{"."
<code className="rounded bg-white px-1 py-0.5">client/public/data/seo-overrides.json</code>
, then rebuild and redeploy.
</p>
</section>

<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
<table className="min-w-full text-sm">
thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
<tr>
<th className="px-3 py-2">Path</th>
<th className="px-3 py-2">Default title</th>
<th className="px-3 py-2">Override</th>
<th className="px-3 py-2">No-index?</th>
<th className="px-3 py-2"></th>
</tr>
</thead>
<tbody>
{rows.map((row) => (
<tr key={row.path} className="border-t border-slate-100">
<td className="px-3 py-2 font-mono text-xs">{row.path}</td>
<td className="px-3 py-2 text-slate-600">{row.defaults.title}</td>
<td className="px-3 py-2">
{row.override ? (
<span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
customised
</span>
) : (
<span className="text-xs text-slate-400">—</span>
)}
</td>
<td className="px-3 py-2">
{row.override?.noIndex ? (
<span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
hidden
</span>
) : (
<span className="text-xs text-slate-400">indexable</span>
)}
</td>
<td className="px-3 py-2 text-right">
<button
type="button"
onClick={() => setEditing(row)}
className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
>
Edit
</button>
{row.override && (
<button
type="button"
onClick={() => remove(row.path)}
className="ml-2 rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
>
Reset
</button>
)}}
</td>
</tr>
</tbody>
</table>
</div>
```

{editing && (
<OverrideEditor
row={editing}
onClose={()=>setEditing(null)}
onSaved={async()=>{
  setEditing(null);
  await load();
}}
/>
}
```

```typescript
function OverrideEditor({
  row,
  onClose={()=>void}
  onSaved={()=>void}
}) {
  const addToast = useToastStore((s)=>s.addToast);
  const initial = row.override??({{} as Partial<SeoOverride>});
  const [title, setTitle] = useState(initial.title??(""));
  const [description, setDescription] = useState(initial.description??(""));
  const [keywords, setKeywords] = useState((initial.keywords??[]).join(","));
  const [ogImage, setOgImage] = useState(initial.ogImage??(""));
  const [noIndex, setNoIndex] = useState(Boolean(initial.noIndex));
  const [saving, setSaving] = useState(false);

  const save = async()=>{
    setSaving(true);
    try {
      await adminApi.upsertSeoOverride({
        path: row.path,
        title: title.trim()||null,
        description: description.trim()||null,
        keywords: keywords
      }, split(","))
      map((k)=>k.trim())
      .filter(Boolean),
      ogImage: ogImage.trim()||null,
      noIndex,
    });
    addToast("success", "Override saved.");
    onSaved();
    catch(e) {
      const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
      addToast("error", msg??"Save failed.");
    } finally {
      setSaving(false);
    }
  };
}

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <div>
      <h3 className="text-lg font-bold">SEO override</h3>
      <p className="font-mono text-xs text-slate-500">{row.path}</p>
    </div>
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <p>
        <strong>Default title:</strong> {row.defaults.title}
      </p>
      <p className="mt-1">
        <strong>Default description:</strong> {row.defaults.description}
      </p>
    </div>
    <Field label="Title (leave blank to inherit default)">
      <input
        type="text"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        maxLength={200}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </Field>
    <Field label="Description">
      <textarea
        rows={3}
        value={description}
        onChange={(e)=>setDescription(e.target.value)}
        maxLength={500}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </Field>
    <Field label="Keywords (comma-separated)">
      <input
        type="text"
        value={keywords}
        onChange={(e)=>setKeywords(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </Field>
    <Field label="Open Graph image URL">
      <input
        type="url"
        value={ogImage}
        onChange={(e)=>setOgImage(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </Field>
    <label className="flex items-center gap-2 text-sm">
<input type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} />
<span>Hide from search engines (noindex) and from sitemap</span>
</label>
<div className="flex justify-end gap-2">
<button
type="button"
onClick={onClose}
className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
>
Cancel
</button>
<button
type="button"
disabled={saving}
onClick={save}
className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
>
{saving ? "Saving..." : "Save override"}
</button>
</div>
</div>
);
}

/* --- Redirects --- */


function RedirectsPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [items, setItems] = useState<UrlRedirect[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    source: "",
    destination: "",
    type: 301 as 301 | 302,
    isActive: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await adminApi.listRedirects());
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load redirects.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm({source: "", destination: "", type: 301, isActive: true});
    setEditingId(null);
  };

  const submit = async () => {
    try {
      if (editingId) {
        await adminApi.updateRedirect(editingId, form);
        addToast("success", "Redirect updated.");
      } else {
        await adminApi.createRedirect(form);
        addToast("success", "Redirect created.");
      }
      resetForm();
      await load();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Save failed.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this redirect?")) return;
    try {
      await adminApi.deleteRedirect(id);
      addToast("success", "Redirect deleted.");
      await load();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Delete failed.");
    }
  };

  if (loading) return <Spinner/>;
  if (!items) return null;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700">
          {editingId ? "Edit redirect" : "Add redirect"}
        </h2>
        <div className="grid-grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Source path">
            <input
              type="text"
              value={form.source}
              onChange={(e) => setForm({...form, source: e.target.value})}
placeholder="/old-page"
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm·font-mono"
/>
</Field>
<Field·label="Destination">
<input
type="text"
value={form.destination}
onChange={(e) => setForm({...form, destination: e.target.value})}
placeholder="/new-page·or·https://..."
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>
</Field>
<Field·label="Type">
<select
value={form.type}
onChange={(e) => setForm({...form, type: Number(e.target.value)·as·301|·302})}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
>
<option value={301}>301 (permanent)</option>
<option value={302}>302 (temporary)</option>
</select>
</Field>
<label·className="flex·items-end·gap-2·text-sm">
<input
type="checkbox"
checked={form.isActive}
onChange={(e) => setForm({...form, isActive: e.target.checked})}
/>
<span>Active</span>
</label>
</div>
<div·className="flex·justify-end·gap-2">
{editingId && (
<button
type="button"
onClick={resetForm}
className="rounded-md·border·border-slate-300·px-3·py-1.5·text-sm·font-medium·hover:bg-slate-50"
>
Cancel
</button>
)}
<button
type="button"
onClick={submit}
disabled={!form.source||!form.destination}
className="rounded-md·bg-primary-600·px-4·py-1.5·text-sm·font-semibold·text-white·hover:bg-primary-700·disabled:opacity-50"
>
{editingId ? "Save·changes" : "Create·redirect"}
</button>
</div>
</section>

<div·className="overflow-x-auto·rounded-xl·border·border-slate-200·bg-white">
<table·className="min-w-full·text-sm">
<thead·className="bg-slate-50·text-left·text-xs·uppercase·text-slate-600">
<tr>
<th·className="px-3·py-2">Source</th>
<th·className="px-3·py-2">Destination</th>
<th·className="px-3·py-2">Type</th>
<th·className="px-3·py-2">Active</th>
<th·className="px-3·py-2"></th>
</tr>
</thead>
<tbody>
{items.length === 0 && (
<tr>
<td·colSpan={5}·className="px-3·py-6·text-center·text-sm·text-slate-500">
No·redirects·yet.
</td>
</tr>
)}}
{items.map((r) => (
<tr·key={r._id}·className="border-t·border-slate-100">
<td·className="px-3·py-2·font-mono·text-xs">{r.source}</td>
<td·className="px-3·py-2·font-mono·text-xs">{r.destination}</td>
<td·className="px-3·py-2">{r.type}</td>
<td·className="px-3·py-2">
{r.isActive ? (
<span
className="rounded·bg-emerald-100·px-2·py-0.5·text-xs·font-semibold·text-emerald-800">
on
</span>
) : (
<span·className="rounded·bg-slate-200·px-2·py-0.5·text-xs·text-slate-600">
off
</span>
)}}
</td>
<td·className="px-3·py-2·text-right">
<button
type="button"
onClick={() => {
setEditingId(r._id);
setForm({
source: r.source,
destination: r.destination,
type: r.type,
isActive: r.isActive,
}});
}}
className="rounded-md·border·border-slate-300·px-2·py-1·text-xs·font-medium·hover:bg-slate-50"
>
Edit
/* --- Sitemap status --------------------------------------------------- */

function SitemapPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [status, setStatus] = useState<SitemapStatus|null>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setStatus(await adminApi.getSitemapStatus());
      } catch (e) {
        const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
        addToast("error", msg ?? "Could not load sitemap status.");
      } finally {
        setLoading(false);
      }
    })();
    [addToast]);

    if (loading) return <Spinner />;
    if (!status) return null;

    return (
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700">Sitemap</h2>
        <dl className="grid-grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat label="Site URL" value={status.siteUrl}/>
          <Stat
            label="Sitemap URL"
            value={
              <a
                href={status.sitemapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 underline"
              >
                {status.sitemapUrl}
              </a>
            }
          />
          <Stat label="Indexable pages (static)" value={status.totalIndexablePages}/>
          <Stat label="URLs currently in sitemap" value={status.pagesInSitemap}/>
          <Stat label="Pages hidden by override" value={status.pagesHiddenByOverride}/>
          <Stat label="Overrides on file" value={status.overridesCount}/>
          <Stat label="Generated at" value={new Date(status.generatedAt).toLocaleString()}/>
        </dl>
      </section>
    );
  }

  function Stat({label, value}: {label: string; value: React.ReactNode}) {
    return (
      <div className="rounded-md border border-slate-200 p-3">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mt-1 text-sm font-sembold text-slate-800">{value}</dd>
      </div>
    );
  }

  function Field({label, children}: {label: string; children: React.ReactNode}) {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
        {children}
      </label>
    );
  }
}