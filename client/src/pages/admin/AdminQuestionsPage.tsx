import {useEffect, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import DataTable, {type, DataTableColumn, Pagination} from "@/components/admin/DataTable";
import Badge from "@/components/admin/Badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import {useSetFilter} from "@/hooks/useSetFilter";
import {
  type: AdminQuestionListEntry,
  DIFFICULTIES,
  type: Difficulty,
  DIFFICULTY_LABELS,
  type: QuestionPublicationStatus,
  SUBJECT_AREAS,
  type: SubjectArea,
} from "@upcat/shared";

export default function AdminQuestionsPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const {setOptions, selectedSetId, setSelectedSetId} = useSetFilter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subjectArea, setSubjectArea] = useState("" || SubjectArea>("");
  const [difficulty, setDifficulty] = useState("" || Difficulty>("");
  const [hasFlaggedReports, setHasFlaggedReports] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState("" || QuestionPublicationStatus>("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("asc" || "desc")("desc");

  const [data, setData] = useState({
    items: AdminQuestionListEntry[];
    total: number;
    totalPages: number
  }).| null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmRow, setConfirmRow] = useState<string>|null>(null);
  const latestRefreshRequestId = useRef(0);

  const refresh = async () => {
    const requestId = ++latestRefreshRequestId.current;
    if (!selectedSetId) {
      if (requestId === latestRefreshRequestId.current) {
        setData({items: [], total: 0, totalPages: 1});
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const result = await adminApi.listQuestions({
        page,
        limit: 20,
        setId: selectedSetId,
        search: search.trim() || undefined,
        subjectArea: subjectArea || undefined,
        difficulty: difficulty || undefined,
        hasFlaggedReports: hasFlaggedReports || undefined,
        includeDeleted: includeDeleted || undefined,
        publicationStatus: publicationStatus || undefined,
        sortBy,
        sortOrder,
      });
      if (requestId === latestRefreshRequestId.current) {
        setData(result);
      }
      catch (e) {
        if (requestId === latestRefreshRequestId.current) {
          const msg = (e as {response?: {data?: {error?: string}}}).response?.data?.error;
          addToast("error", msg ?? "Could not load questions.");
        }
      }
      finally {
        if (requestId === latestRefreshRequestId.current) {
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedSetId, subjectArea, difficulty, hasFlaggedReports, includeDeleted, publicationStatus, sortBy, sortOrder]);

  const onSort = (key: string) => {
    if (sortBy === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const columns: DataTableColumn<AdminQuestionListEntry>[] = [
    {
      key: "questionTextPreview",
      header: "Question",
      render: (r) => (
        <div className="min-w-0">
          <Link to={`/admin/questions/${r._id}`}
            className="line-clamp-2 font-medium text-slate-800 hover:text-primary-700">
{r.questionTextPreview}
</Link>
<p className="text-xs·text-slate-500">{r.subtopic}</p>
</div>
},
{
key: "subjectArea",
header: "Subject",
sortable: true,
render: (r) => <span className="text-xs">{r.subjectArea}</span>
},
{
key: "difficulty",
header: "Difficulty",
sortable: true,
render: (r) => (
<Badge variant={
r.difficulty === "easy" ? "success"
: r.difficulty === "very_hard" ? "danger"
: "warning"
}>
{DIFFICULTY_LABELS[r.difficulty]}
</Badge>
),
{
key: "correctAnswer",
header: "Ans",
render: (r) => <span className="font-mono·text-xs">{r.correctAnswer}</span>
},
{
key: "usageCount",
header: "Uses",
sortable: true,
render: (r) => <span className="text-xs">{r.usageCount}</span>
},
{
key: "flagCount",
header: "Flags",
sortable: true,
render: (r) => (r.flagCount > 0 ? <Badge variant="danger">{r.flagCount}</Badge> :
<span className="text-xs·text-slate-400">0</span>),
},
{
key: "isDeleted",
header: "Status",
render: (r) => (
<div className="flex·flex-col·gap-1">
{r.isDeleted ? <Badge variant="neutral">Deleted</Badge> : <Badge variant="success">Active</Badge>}
<Badge variant={
r.publicationStatus === "published" ? "success"
: r.publicationStatus === "in_review" ? "warning"
: "neutral"
}>
{r.publicationStatus ?? "draft"}
</Badge>
)</div>
),
{
key: "actions",
header: "",
className: "text-right",
render: (r) => (
<div className="flex·justify-end·gap-1">
<Link to={`/admin/questions/${r.id}`}>
<ClassName="rounded-md·border·border-slate-200·px-2·py-1·text-xs·hover:bg-slate-50">Edit</Link>
{!r.isDeleted && (
<button
type="button"
onClick={() => setConfirmRow(r._id)}
ClassName="rounded-md·border·border-primary-200·px-2·py-1·text-xs·text-primary-600·hover:bg-primary-50"
>
Delete
</button>
)}
</div>
),
},
];
```

return (
<div className="space-y-4">
{/* Set selector row */}
<div className="flex·flex-wrap·items-center·gap-2">
<select
required
value={selectedSetId}
onChange={(e) => {
setSelectedSetId(e.target.value);
setPage(1);
}}
}
<ClassName="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
>
{setOptions.length === 0 ? (
<option value="">No·sets·available</option>
) : (
<option key={set._id} value={set._id}}{set.name}</option>
))
}
</select>
<Link
to="/admin/question-sets"
className="rounded-md·border·border-slate-300·px-3·py-1.5·text-xs·font-semibold·text-slate-700·hover:bg-slate-50"
>
Manage·Sets
</Link>
</div>

{/*·Filters·action·buttons·*/}
<div·className="flex·flex-wrap·items-center·justify-between·gap-3">
<div·className="flex·flex-wrap·items-center·gap-2">
<input
type="search"
value={search}
onChange={(e) => setSearch(e.target.value)}
onKeyDown={(e) => e.key === "Enter" && (setPage(1), refresh())}
placeholder="Search·question·text..."
className="rounded-md·border·border-slate-300·px-3·py-1.5·text-sm·focus:border-primary-500·focus:outline-none"
/>
<select·value={subjectArea}·onChange={(e) => {
setSubjectArea(e.target.value·as·SubjectArea·|·"");
setPage(1);
}}·className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm">
<option·value="">All·subjects</option>
{SUBJECT_AREAS.map((s) => <option·key={s}·value={s}>{s}</option>)}
</select>
<select·value={difficulty}·onChange={(e) => {
setDifficulty(e.target.value·as·Difficulty·|·"");
setPage(1);
}}·className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm">
<option·value="">All·difficulties</option>
{DIFFICULTIES.map((d) => <option·key={d}·value={d}>{DIFFICULTY_LABELS[d]}</option>)}
</select>
<label·className="inline-flex·items-center·gap-1·text-xs·text-slate-700">
<input·type="checkbox"·checked={hasFlaggedReports}·onChange={(e) => {
setHasFlaggedReports(e.target.checked);
setPage(1);
}}/>·Flagged·only
</label>
<label·className="inline-flex·items-center·gap-1·text-xs·text-slate-700">
<input·type="checkbox"·checked={includeDeleted}·onChange={(e) => {
setIncludeDeleted(e.target.checked);
setPage(1);
}}/>·Include·deleted
</label>
<select·value={publicationStatus}·onChange={(e) => {
setPublicationStatus(e.target.value·as·QuestionPublicationStatus·|·"");
setPage(1);
}}·className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm">
<option·value="">Any·publish·status</option>
<option·value="draft">Draft</option>
<option·value="in_review">In·Review</option>
<option·value="published">Published</option>
<option·value="archived">Archived</option>
</select>
</div>
<div·className="flex·flex-wrap·gap-2">
<Link to="/admin/questions/workflow"
className="rounded-md·border·border-slate-300·px-3·py-1.5·text-xs·font-semibold·text-slate-700·hover:bg-slate-50">
Workflow
</Link>
<Link to="/admin/questions/import-export"
className="rounded-md·border·border-slate-300·px-3·py-1.5·text-xs·font-semibold·text-slate-700·hover:bg-slate-50">
Import/·Export
</Link>
<Link to="/admin/questions/media"
className="rounded-md·border·border-slate-300·px-3·py-1.5·text-xs·font-semibold·text-slate-700·hover:bg-slate-50">
Media·Library
</Link>
{selected.size·>·0·&&(
<button·type="button"·onClick={(() => setConfirmBulk(true))}
className="rounded-md·border·border-primary-300·px-3·py-1.5·text-xs·font-medium·text-primary-700·hover:bg-primary-50">
Delete·{selected.size}
</button>
)}
<Link to="/admin/questions/new"
className="rounded-md·bg-primary-600·px-3·py-1.5·text-xs·font-semibold·text-white·hover:bg-primary-700">
+·New·Question
</Link>
</div>
</div>

<DataTable
columns={columns}
rows={data?.items·??·[]}
getRowId={(r) => r._id}
isLoading={loading}
selectable
selectedIds={selected}
onSelectionChange={setSelected}
onSort={onSort}
sortBy={sortBy}
sortOrder={sortOrder}
onRowClick={(r) => navigate(`/admin/questions/${r._id}`)}
/>
<Pagination·page={page}·totalPages={data?.totalPages·??·1}·total={data?.total·??·0}·onPageChange={setPage}/>

<ConfirmDialog
isOpen={confirmBulk}
title="Delete·selected·questions?"
message={`This will soft-delete ${selected.size} question(s). They can be restored from MongoDB.`}
confirmText="DELETE"
confirmLabel="Delete"
variant="danger"
onClose={() => setConfirmBulk(false)}
onConfirm={async () => {
  await adminApi.bulkDeleteQuestions([...selected]);
  addToast("success", "Questions deleted.");
  setSelected(new Set());
  setConfirmBulk(false);
  refresh();
}}
/>
<ConfirmDialog
  isOpen={confirmRow !== null}
  title="Delete question?"
  message="This question will be soft-deleted."
  confirmLabel="Delete"
  variant="danger"
  onClose={() => setConfirmRow(null)}
  onConfirm={async () => {
    if (!confirmRow) return;
    await adminApi.deleteQuestion(confirmRow);
    addToast("success", "Deleted.");
    setConfirmRow(null);
    refresh();
  }}
/>
</div>
);