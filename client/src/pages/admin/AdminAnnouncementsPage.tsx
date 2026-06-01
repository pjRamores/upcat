import {useEffect, useState} from "react";
import {isAxiosError} from "axios";
import Modal from "@/components/Modal";
import Badge from "@/components/admin/Badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Spinner from "@/components/Spinner";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import {type Announcement, ANNOUNCEMENT_TYPES, type AnnouncementType} from "@upcat/shared";

interface FormState {
  title: string;
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}

const EMPTY: FormState = {title: "", message: "", type: "info", isActive: true, startsAt: "", expiresAt: ""};

function toLocalInput(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const tz = dt.getTimezoneOffset() * 60_000;
  return new Date(dt.getTime() - tz).toISOString().slice(0, 16);
}

export default function AdminAnnouncementsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [items, setItems] = useState<Announcement[]>(([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const [editing, setEditing] = useState<{id?: string; form: FormState} | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setItems(await adminApi.listAnnouncements());
      catch(e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Could not load announcements.");
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      refresh(); /* eslint-disable-line */
    }, []);

    const publishStaticAnnouncements = async () => {
      setPublishing(true);
      try {
        const data = await adminApi.publishAnnouncements();
        if (data?.payload) {
          const json = JSON.stringify(data.payload, null, 2);
          const blob = new Blob([json], {type: "application/json"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `announcements-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setLastPublished(new Date().toISOString());
          addToast("success", `Announcements published! ${data.contentSize} bytes. Save to client/public/data/announcements.json`);
        }
        catch(error) {
          if (isAxiosError(error) && error.response?.status === 401) {
            addToast("error", "Admin session expired. Please sign in again.");
            return;
          }
          addToast("error", "Failed to publish announcements.");
        } finally {
          setPublishing(false);
        }
      };
    };

    const save = async () => {
      if (!editing) return;
      const body: Partial<Announcement> = {
        title: editing.form.title.trim(),
        message: editing.form.message.trim(),
        type: editing.form.type,
        isActive: editing.form.isActive,
        startsAt: editing.form.startsAt ? new Date(editing.form.startsAt).toISOString() : null,
        expiresAt: editing.form.expiresAt ? new Date(editing.form.expiresAt).toISOString() : null,
      };
      try {
        if (editing.id) await adminApi.updateAnnouncement(editing.id, body);
        else await adminApi.createAnnouncement(body);
        addToast("success", "Saved.");
        setEditing(null);
        refresh();
      } catch(e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Save failed.");
      }
    };
  };
}
return (
<div className="space-y-4">
<section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
<div className="flex items-start justify-between gap-3">
<div>
<h2 className="text-sm font-semibold text-amber-900">Publish Static Announcements</h2>
<p className="mt-1 text-xs text-amber-800">
Export the announcements snapshot for static delivery. This reduces runtime API calls and keeps banner content deterministic.
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
onClick={() => void publishStaticAnnouncements()}
className="rounded-bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
>
{publishing ? "Publishing..." : "Publish Now"}
</button>
</div>
<p className="mt-2 text-xs text-amber-700">
Next step: save the downloaded JSON to client/public/data/announcements.json, then rebuild and redeploy.
</p>
</section>

<div className="flex justify-end">
<button type="button" onClick={() => setEditing({form: EMPTY})}>
className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700">
New Announcement
</button>
</div>

{loading ? (
<div className="flex justify-center py-20"><Spinner/></div>
) : items.length === 0 ? (
<p className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">No announcements.</p>
) : (
<ul className="space-y-3">
{items.map((a) => (
<li key={a._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
<div className="flex flex-wrap items-start justify-between gap-3">
<div className="min-w-0">
<p className="font-semibold text-slate-900">{a.title}</p>
<p className="mt-1 text-sm text-slate-700">{a.message}</p>
<div className="mt-2 flex flex-wrap gap-2 text-xs">
<Badge
variant={a.type === "maintenance" ? "danger" : a.type === "warning" ? "warning" : "info"}>
{a.type}</Badge>
<Badge
variant={a.isActive ? "success" : "neutral"}>
{a.isActive ? "Active" : "Hidden"}</Badge>
{a.startsAt && <span
className="text-slate-500">From {new Date(a.startsAt).toLocaleString()}</span>}
{a.expiresAt && <span
className="text-slate-500">Until {new Date(a.expiresAt).toLocaleString()}</span>}
</div>
</div>
<div className="flex gap-2">
<button type="button" onClick={() => setEditing({
id: a._id,
form: {
title: a.title,
message: a.message,
type: a.type,
isActive: a.isActive,
startsAt: toLocalInput(a.startsAt),
expiresAt: toLocalInput(a.expiresAt)
}}
})}
className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Edit</button>
<button type="button" onClick={() => setConfirmDel(a._id)}
className="rounded-md border border-primary-200 px-2 py-1 text-xs text-primary-600 hover:bg-primary-50">Delete</button>
</div>
</div>
</li>
)})
</ul>
)

<Modal
isOpen={editing !== null}
onClose={() => setEditing(null)}
title={editing?.id ? "Edit announcement" : "New announcement"}
size="lg"
footer={
<div className="flex justify-end gap-2">
<button type="button" onClick={() => setEditing(null)}
className="rounded-md border border-slate-200 px-3 py-1.5 text-sm">Cancel</button>
<button type="button" onClick={save}
className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">Save</button>
</div>
}
>
>
{editing && (
<div className="space-y-3 text-sm">
  <Field label="Title">
    <input value={editing.form.title} onChange={(e) => setEditing({
      ...editing,
      form: {...editing.form, title: e.target.value}
    })} className="w-full rounded-md border border-slate-300 px-3 py-1.5"/>
  </Field>
  <Field label="Message">
    <textarea rows={4} value={editing.form.message} onChange={(e) => setEditing({
      ...editing,
      form: {...editing.form, message: e.target.value}
    })} className="w-full rounded-md border border-slate-300 px-3 py-2"/>
  </Field>
  <div className="grid-grid-cols-2 gap-3">
    <Field label="Type">
      <select value={editing.form.type} onChange={(e) => setEditing({
        ...editing,
        form: {...editing.form, type: e.target.value as AnnouncementType}
      })} className="w-full rounded-md border border-slate-300 px-2 py-1.5">
        {ANNOUNCEMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>
    </Field>
    <Field label="Status">
      <label className="flex-items-center gap-2 pt-2">
        <input type="checkbox" checked={editing.form.isActive} onChange={(e) => setEditing({
          ...editing,
          form: {...editing.form, isActive: e.target.checked}
        })}/>
        Active
      </label>
    </Field>
    <Field label="Starts at (optional)">
      <input type="datetime-local" value={editing.form.startsAt} onChange={(e) => setEditing({
        ...editing,
        form: {...editing.form, startsAt: e.target.value}
      })} className="w-full rounded-md border border-slate-300 px-2 py-1.5"/>
    </Field>
    <Field label="Expires at (optional)">
      <input type="datetime-local" value={editing.form.expiresAt}
        onChange={(e) => setEditing({
          ...editing,
          form: {...editing.form, expiresAt: e.target.value}
        })} className="w-full rounded-md border border-slate-300 px-2 py-1.5"/>
    </Field>
  </div>
</div>
}
</Modal>

<ConfirmDialog
  isOpen={confirmDel !== null}
  title="Delete announcement?"
  message="This is permanent."
  variant="danger"
  confirmLabel="Delete"
  onClose={() => setConfirmDel(null)}
  onConfirm={async () => {
    if (!confirmDel) return;
    await adminApi.deleteAnnouncement(confirmDel);
    addToast("success", "Deleted.");
    setConfirmDel(null);
    refresh();
  }}
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