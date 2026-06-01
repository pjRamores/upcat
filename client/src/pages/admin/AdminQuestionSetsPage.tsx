import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import DataTable, {type} DataTableColumn, Pagination} from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Modal from "@/components/Modal";
import {adminApi, type} AdminQuestionSet} from "@/lib/adminApi";
import {useToastStore} from "@stores/toastStore";
import {SUBJECT_AREAS} from "@upcat/shared";

function buildDefaultDistribution() {
  return Object.fromEntries(
    SUBJECT_AREAS.map((s) => [s, {questions: 0, timeLimit: 10}]),
    as Record<string, {questions: number, timeLimit: number}});
}

type FormMode = "create" | "edit";

interface SetForm {
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  distribution: Record<string, {questions: number, timeLimit: number}};
  difficultyMix: {
    easy: number;
    medium: number;
    hard: number;
    very_hard: number;
  };
}

function emptyForm(): SetForm {
  return {
    name: "",
    description: "",
    isActive: true,
    priority: 1,
    distribution: buildDefaultDistribution(),
    difficultyMix: {easy: 0, medium: 0, hard: 0, very_hard: 0},
  };
}

function formFromSet(set: AdminQuestionSet): SetForm {
  const hasNoAttachedQuestions = Number(set.questionCount ?? -1) === 0;
  const distribution: Record<string, {questions: number, timeLimit: number}} = {};
  for (const s of SUBJECT_AREAS) {
    const existing = set.distribution?.[s];
    distribution[s] = {
      questions: hasNoAttachedQuestions ? 0 : Number(existing?.questions ?? 0),
      timeLimit: Number(existing?.timeLimit ?? 0),
    };
  }
  return {
    name: set.name,
    description: set.description ?? "",
    isActive: set.isActive !== false,
    priority: Math.min(100, Math.max(1, Number(set.priority ?? 1))),
    distribution,
    difficultyMix:
      easy: hasNoAttachedQuestions ? 0 : Number(set.difficultyMix?.easy ?? 0),
      medium: hasNoAttachedQuestions ? 0 : Number(set.difficultyMix?.medium ?? 0),
      hard: hasNoAttachedQuestions ? 0 : Number(set.difficultyMix?.hard ?? 0),
      very_hard: hasNoAttachedQuestions ? 0 : Number(set.difficultyMix?.very_hard ?? 0),
    };
  };
}

export default function AdminQuestionSetsPage() {
  const addToast = useToastStore((s) => s.addToast);

  const [page, setPage] = useState(1);
  const [data, setData] = useState({items: AdminQuestionSet[]}, total: number; totalPages: number}) | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("<asc> | <desc>>("desc"));

  // Modal state
  const [mode, setMode] = useState<FormMode>("create");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminQuestionSet | null>(null);
  const [form, setForm] = useState<SetForm>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const result = await adminApi.getQuestionSets({page: p, limit: 20, sort: sortBy, order: sortOrder});
      const items = result.items as AdminQuestionSet[];
      setData({items, total: result.total, totalPages: result.totalPages});
    } catch (e) {
      const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
      addToast("error", msg ?? "Could not load question sets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
load(page);
}, [page, sortBy, sortOrder]);

const onSort = (key: string) => {
  if (sortBy === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  else {
    setSortBy(key);
    setSortOrder("desc");
  }
};

const openCreate = () => {
  setMode("create");
  setForm(emptyForm());
  setErrors({});
  setEditTarget(null);
  setShowModal(true);
};

const openEdit = async (set: AdminQuestionSet) => {
  setMode("edit");
  let source = set;
  if (set._id) {
    try {
      source = await adminApi.getQuestionSet(set._id);
    } catch {
      // Fall back to table row data when detail fetch fails.
    }
  }
  setForm(formFromSet(source));
  setErrors({});
  setEditTarget(source);
  setShowModal(true);
};

const validate = () => {
  const next: Partial<Record<string, string>> = {};
  if (!form.name.trim()) next.name = "Name is required.";
  const tTotal = SUBJECT_AREAS.reduce((sum, s) => sum + (form.distribution[s]?.timeLimit ?? 0), 0);
  if (tTotal <= 0) next.distributionTime = "At least one subject must have a time limit > 0.";
  setErrors(next);
  return Object.keys(next).length === 0;
};

const handleSave = async () => {
  if (!validate()) return;
  setSaving(true);
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      priority: form.priority,
      distribution: form.distribution,
    };
    if (mode === "create") {
      await adminApi.createQuestionSet(payload);
      addToast("success", "Question set created.");
    } else if (editTarget?._id) {
      await adminApi.updateQuestionSet(editTarget._id, payload);
      addToast("success", "Question set updated.");
    }
    setShowModal(false);
    setPage(1);
    load(1);
    catch(e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not save question set.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (set: AdminQuestionSet) => {
    if (!set._id) return;
    try {
      await adminApi.updateQuestionSet(set._id, {isActive: !set.isActive});
      addToast("success", `Set ${set.isActive ? "deactivated" : "activated"}.`);
      load(page);
    } catch(e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not update set.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await adminApi.deleteQuestionSet(confirmDeleteId);
      addToast("success", "Question set deleted.");
      setConfirmDeleteId(null);
      load(page);
    } catch(e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not delete question set.");
    } finally {
      setDeleting(false);
    }
  };

  const setDistribution = (subject: string, field: "questions" | "timeLimit", value: number) => {
    setForm((prev) => ({
      ...prev,
    }));
  };
distribution: {
prev.distribution,
[subject]: {
prev.distribution[subject]??{questions:0, timeLimit:0}},
[field]: Math.max(0, value)
},
},
}});
};

const totalPublishedItems = SUBJECT_AREAS.reduce(
(sum, subject) => sum + (form.distribution[subject]?.questions??0),
0,
);

const totalTimeLimit = SUBJECT_AREAS.reduce(
(sum, subject) => sum + (form.distribution[subject]?.timeLimit??0),
0,
);

const columns: DataTableColumn<AdminQuestionSet>[] = [
{
key: "name",
header: "Name",
sortable: true,
render: (r) => (
<div>
<p className="font-medium text-slate-800">{r.name}</p>
<r.description && <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p>
</div>
),
},
{
key: "totalQuestions",
header: "Questions",
sortable: true,
render: (r) => (
<div className="text-xs">
<p><span className="font-semibold">{r.totalQuestions}</span> configured</p>
<typeof r.questionCount === "number" && (
<p className="text-slate-500">{r.questionCount} in bank</p>
))
</div>
),
},
{
key: "totalTimeLimit",
header: "Time (min)",
sortable: true,
render: (r) => <span className="text-xs">{r.totalTimeLimit}</span>,
},
{
key: "usageCount",
header: "Exams Used",
sortable: true,
render: (r) => <span className="text-xs">{r.usageCount??0}</span>,
},
{
key: "priority" as any,
header: "Priority",
sortable: true,
render: (r) => <span className="text-xs">{r.priority??1}</span>,
},
{
key: "isActive",
header: "Status",
render: (r) => (
<Badge variant={r.isActive !== false ? "success" : "neutral"}>
{r.isActive !== false ? "Active" : "Inactive"}
</Badge>
),
},
{
key: "actions",
header: "",
className: "text-right",
render: (r) => (
<div className="flex justify-end gap-1">
<Link
to={`/admin/questions?setId=${encodeURIComponent(String(r._id ?? ""))}`}
className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
>
Questions
</Link>
<button
type="button"
onClick={() => openEdit(r)}
className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
>
Edit
</button>
<button
type="button"
onClick={() => handleToggleActive(r)}
className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
>
{r.isActive !== false ? "Deactivate" : "Activate"}
</button>
<button
type="button"
onClick={() => setConfirmDeleteId(r._id ?? null)}
className="rounded-md border border-primary-200 px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
>
Delete
</button>
</div>
),
},
];
```

```typescript
return (
<div className="space-y-4">
<div className="flex items-center justify-between">
<div className="text-sm text-slate-500">
Manage exam question sets. Subject item counts and difficulty percentages are read-only and auto-calculated from published question statuses.
</div>
<div className="flex gap-2">
<Link
to="/admin/questions"
className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
>
Back to Questions
</Link>
<button
type="button"
onClick={openCreate}
className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
>
New Question Set
</button>
</div>
</div>

<DataTable
columns={columns}
rows={data?.items??[]}
getRowId={(r) => r._id??"}}
isLoading={loading}
onSort={onSort}
sortBy={sortBy}
sortOrder={sortOrder}
/>
<Pagination page={page} totalPages={data?.totalPages??1} total={data?.total??0} onPageChange={setPage}/>

{/* Create / Edit Modal */}
Modal isOpen={showModal} onClose={() => setShowModal(false)}
title={mode === "create" ? "New Question Set" : "Edit Question Set"}
<div className="space-y-4 text-sm">
{/* Name */}
<div>
<label className="mb-1 block text-xs font-semibold text-slate-700">Name</label>
<input
type="text"
value={form.name}
onChange={(e) => setForm((p) => ({...p, name: e.target.value}))}
className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
/>
{errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
</div>

{/* Description */}
<div>
<label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
<textarea
value={form.description}
onChange={(e) => setForm((p) => ({...p, description: e.target.value}))}
rows={2}
className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
/>
</div>

{/* Active toggle */}
<div className="flex items-center gap-2">
<input
id="set-active"
type="checkbox"
checked={form.isActive}
onChange={(e) => setForm((p) => ({...p, isActive: e.target.checked}))}
/>
<label htmlFor="set-active" className="text-xs font-semibold text-slate-700">Active (visible for exam selection)</label>
</div>

{/* Priority */}
<div>
<label className="mb-1 block text-xs font-semibold text-slate-700">
Priority
<span className="ml-1 font-normal text-slate-500">(1-100; lower value = higher priority when selecting sets for users)</span>
</label>
<input
type="number"
min={1}
max={100}
step={1}
value={form.priority}
onChange={(e) => {
const val = Math.min(100, Math.max(1, Math.floor(Number(e.target.value) || 1)));
setForm((p) => ({...p, priority: val}));
}}
className="w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
/>
</div>

{/* Subject distribution */}
<div className="space-y-2">
<div className="flex items-center justify-between">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject Distribution</p>
<p className="text-[11px]·text-slate-500">
Published·items·and·difficulty·mix·are·auto-calculated·on·publish/status·changes.
</p>
</div>

<div
  className="grid·grid-cols-1·gap-2·rounded-lg·border·border-slate-200·bg-gradient-to-r·from-slate-50·to-white·p-3·sm:grid-cols-2">
<div className="rounded-md·border·border-slate-200·bg-white·px-3·py-2">
  <p className="text-[11px]·uppercase·tracking-wide·text-slate-500">Total·Time·Limit</p>
  <p className="mt-1·text-lg·font-semibold·text-slate-800">{totalTimeLimit}·min</p>
</div>
<div className="rounded-md·border·border-slate-200·bg-white·px-3·py-2">
  <p className="text-[11px]·uppercase·tracking-wide·text-slate-500">Published·Items</p>
  <p className="mt-1·text-lg·font-semibold·text-slate-800">{totalPublishedItems}</p>
</div>
</div>

<div className="rounded-lg·border·border-slate-200·overflow-hidden">
<div
  className="grid·grid-cols-[minmax(120px,1fr)_112px_96px]·items-center·gap-2·bg-slate-50·px-3·py-2·text-[11px]·font-semibold·uppercase·+
→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→
</button>
<button
type="button"
onClick={handleSave}
disabled={saving}
className="rounded-md·bg-primary-600·px-4·py-1.5·text-xs·font-semibold·text-white·hover:bg-primary-700·disabled:opacity-60"
>
{saving·?"Saving..."::mode === "create"·?"Create·Set"::"Save·Changes"}
</button>
</div>
</div>
</Modal>

<ConfirmDialog
isOpen={Boolean(confirmDeleteId)}
title="Delete question set?"
message="This will soft-delete the set (mark inactive). Questions inside are not deleted."
confirmText="DELETE"
confirmLabel="Delete"
variant="danger"
onClose={() => setConfirmDeleteId(null)}
onConfirm={handleDelete}
isLoading={deleting}
/>
</div>
);