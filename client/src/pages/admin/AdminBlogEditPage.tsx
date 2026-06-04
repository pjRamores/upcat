import {useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import Spinner from "@/components/Spinner";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import {type BlogPost, type BlogStatus, estimateReadMinutes, isValidBlogSlug, slugifyBlogTitle,} from "@upcat/shared";
import {renderMarkdown} from "@/lib/markdown";

interface FormState {
    slug: string;
    title: string;
    summary: string;
    body: string;
    heroImage: string;
    authorName: string;
    tags: string;
    status: BlogStatus;
}

const EMPTY: FormState = {
    slug: "",
    title: "",
    summary: "",
    body: "",
    heroImage: "",
    authorName: "",
    tags: "",
    status: "draft",
};

export default function AdminBlogEditPage() {
    const {id} = useParams<{id?: string}>();
    const isNew = !id || id === "new";
    const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [loading, setLoading] = useState(isNew);
    const [saving, setSaving] = useState(false);
    const [original, setOriginal] = useState<BlogPost | null>(null);
    const [slugTouched, setSlugTouched] = useState(false);
    const [preview, setPreview] = useState(false);

    useEffect(() => {
        if (isNew) return;
        (async () => {
            try {
                const p = await adminApi.getBlogPost(id!);
                setOriginal(p);
                setForm({
                    slug: p.slug,
                    title: p.title,
                    summary: p.summary,
                    body: p.body,
                    heroImage: p.heroImage ?? "",
                    authorName: p.authorName,
                    tags: p.tags.join(", "),
                    status: p.status,
                });
                setSlugTouched(true);
            } catch (e) {
                const msg = (e as {response?: {data?: {error?: string;};}}.response?.data?.error;
                addToast("error", msg ?? "Could not load post.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isNew, addToast]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((f) => ({...f, [key]: value}));
    };

    const onTitleChange = (v: string) => {
        update("title", v);
        if (!slugTouched && isNew) {
            setForm((f) => ({...f, title: v, slug: slugifyBlogTitle(v)}));
        }
    };

    const previewHtml = useMemo(
        () => (preview ? renderMarkdown(form.body) : ""),
        [preview, form.body],
    );
    const readMin = useMemo(() => estimateReadMinutes(form.body), [form.body]);

    const save = async (publishOverride?: BlogStatus) => {
        const status = publishOverride ?? form.status;
        if (!form.title.trim()) {
            addToast("error", "Title is required.");
            return;
        }
        if (!form.slug || !isValidBlogSlug(form.slug)) {
            addToast("error", "Slug must be lowercase kebab-case (e.g. 'my-first-post').");
            return;
        }
        if (!form.summary.trim()) {
            addToast("error", "Summary is required.");
            return;
        }
        if (!form.body.trim()) {
            addToast("error", "Body is required.");
            return;
        }
        const payload = {

: slug: form.slug.trim(),
: title: form.title.trim(),
: summary: form.summary.trim(),
: body: form.body,
: heroImage: form.heroImage.trim() || null,
: authorName: form.authorName.trim() || "Editor",
: tags: form.tags
: .split(",")
: .map((t) => t.trim())
: .filter(Boolean),
: status,
: };
setSaving(true);
try {
    if (isNew) {
        const created = await adminApi.createBlogPost(payload);
        addToast("success", status === "published" ? "Post published." : "Draft saved.");
        navigate("/admin/blog/${created.id}", { replace: true });
    } else {
        const updated = await adminApi.updateBlogPost(id!, payload);
        setOriginal(updated);
        setForm((f) => ({ ...f, status: updated.status }));
        addToast("success", "Post saved.");
    }
} catch (e) {
    const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
    addToast("error", msg ?? "Save failed.");
} finally {
    setSaving(false);
}
};

if (loading) return <div className="flex justify-center py-20"><Spinner/></div>;

return (
    <div className="space-y-5">
        <div className="flex items-center justify-between">
            <Link to="/admin/blog" className="text-sm text-slate-500 hover:text-slate-700">
                Back to posts
            </Link>
            {(original?.status === "published" && (
                <a href={`/blog/${original.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 underline">
                    View live
                </a>
            ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
                <Section>
                    <Field label="Title">
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-lg font-semibold"
                        />
                    </Field>
                    <Field label="Slug">
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => {
                                setSlugTouched(true);
                                update("slug", e.target.value.toLowerCase());
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                        />
                    </Field>
                    <Field label="Summary (used for meta description + cards)">
                        <textarea
                            rows={2}
                            value={form.summary}
                            onChange={(e) => update("summary", e.target.value)}
                            maxLength={280}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                    </Field>
                </Section>
                <Section>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                            Body (Markdown) - {readMin} min read
                        </span>
                        <button
                            type="button"
                            onClick={() => setPreview((p) => !p)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                            {preview ? "Edit" : "Preview"}
                        </button>
                    </div>
                    {preview ? (
                        <article
                            className="prose prose-slate max-w-none rounded-md border border-slate-200 p-4"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    ) : (
<textarea
  rows={20}
  value={form.body}
  onChange={(e) => update("body", e.target.value)}
  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
/>
</Section>
</div>
<div className="space-y-4">
  <Section>
    <Field label="Status">
      <select
        value={form.status}
        onChange={(e) => update("status", e.target.value as BlogStatus)}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
    </Field>
    <Field label="Author name">
      <input
        type="text"
        value={form.authorName}
        onChange={(e) => update("authorName", e.target.value)}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
    </Field>
    <Field label="Hero image URL">
      <input
        type="url"
        value={form.heroImage}
        onChange={(e) => update("heroImage", e.target.value)}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      {form.heroImage && (
        <img
          src={form.heroImage}
          alt=""
          className="mt-2 max-h-32 w-full rounded-md border border-slate-200 object-cover"
        />
      )}
    </Field>
    <Field label="Tags (comma-separated)">
      <input
        type="text"
        value={form.tags}
        onChange={(e) => update("tags", e.target.value)}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
    </Field>
    {original && (
      <p className="text-xs text-slate-500">
        Created {new Date(original.createdAt).toLocaleDateString()} · Last edit{" "}
        {new Date(original.updatedAt).toLocaleDateString()}
        {original.publishedAt && (
          <> · Published {new Date(original.publishedAt).toLocaleDateString()}</>
        )}
      </p>
    )}
  </Section>
  <div className="space-y-2">
    <button
      type="button"
      onClick={() => save()}
      disabled={saving}
      className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
    >
      {saving ? "Saving..." : "Save"}
    </button>
    {form.status === "draft" && (
      <button
        type="button"
        onClick={() => save("published")}
        disabled={saving}
        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Save & publish
      </button>
    )}
  </div>
</div>
</div>
);
}

function Section({children}: {children: React.ReactNode}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </section>
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
function process<T>(data: T[]): T[] {
    return data.filter(item => item instanceof Date);
}