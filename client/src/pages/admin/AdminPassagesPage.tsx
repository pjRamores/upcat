import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import DataTable, {type, DataTableColumn, Pagination} from "@/components/admin/DataTable";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import {useSetFilter} from "@/hooks/useSetFilter";
import {type, Passage, SUBJECT_AREAS, type, SubjectArea} from "@upcat/shared";

type Row = Passage & { questionCount: number };

export default function AdminPassagesPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const {setOptions, selectedSetId, setSelectedSetId} = useSetFilter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subjectArea, setSubjectArea] = useState("<" | SubjectArea>("");
  const [data, setData] = useState({ items: Row[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmRow, setConfirmRow] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listPassages({
        page,
        limit: 20,
        search: search.trim() || undefined,
        subjectArea: subjectArea || undefined,
        setId: selectedSetId || undefined,
      });
      setData(result as unknown as { items: Row[]; total: number; totalPages: number });
      catch(e) {
        const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
        addToast("error", msg ?? "Could not load passages.");
      }
      finally {
        setLoading(false);
      }
    };
  };

  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, [page, subjectArea, selectedSetId]);

  const columns: DataTableColumn<Row>[] = [
    {
      key: "title",
      header: "Title",
      render: (r) => <Link to={`/admin/passages/${r._id}`}>
        className="font-medium text-slate-800 hover:text-primary-700">{r.title}</Link>
      },
      {
        key: "subjectArea",
        header: "Subject",
        render: (r) => <span className="text-xs">{r.subjectArea}</span>,
        {
          key: "questionCount",
          header: "Questions",
          render: (r) => <span className="text-xs">{r.questionCount}</span>,
        },
        {
          key: "source",
          header: "Source",
          render: (r) => <span className="text-xs text-slate-500">{r.source?? "-"}</span>
        },
        {
          key: "actions",
          header: "",
          className: "text-right",
          render: (r) => (
            <div className="flex justify-end gap-1">
              <Link to={`/admin/passages/${r._id}`}>
                className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Edit</Link>
                <button type="button" onClick={() => setConfirmRow(r._id)}>
                  className="rounded-md border border-primary-200 px-2 py-1 text-xs text-primary-600 hover:bg-primary-50">Delete</button>
                </button>
              </div>
            ),
          },
        }
      ],
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex-flex-wrap items-center justify-between gap-3">
        <div className="flex-flex-wrap gap-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()} placeholder="Search title..."
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"/>
          <select value={subjectArea} onChange={(e) => {
            setSubjectArea(e.target.value as SubjectArea | "");
            setPage(1);
          }} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All subjects</option>
            {SUBJECT_AREAS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select
            required
            value={selectedSetId}
            onChange={(e) => {
              setSelectedSetId(e.target.value);
              setPage(1);
            }}
          } className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {setOptions.length === 0 ? (
              <option value="">No sets available</option>
            ) : (
              setOptions.map((s) => (
                <option key={s._id} value={s._id}}{s.name}</option>
              ))
            )}
          }
        </select>
      </div>
    </div>
  );
}
</select>
</div>
<Link to="/admin/passages/new"
className="rounded-md·bg-primary-600·px-3·py-1.5·text-xs·font-semibold·text-white·hover:bg-primary-700">+
New Passage</Link>
</div>

<DataTable·columns={columns}·rows={data?.items·??·[]}·getRowId={(r) => r._id}·isLoading={loading}
onRowClick={(r) => navigate(`/admin/passages/${r._id}`)}/>
<Pagination·page={page}·totalPages={data?.totalPages·??·1}·total={data?.total·??·0}·onPageChange={setPage}/>

<ConfirmDialog
isOpen={confirmRow!==null}
title="Delete·passage?"
message="If·any·active·questions·reference·this·passage,·the·delete·will·be·blocked."
confirmLabel="Delete"
variant="danger"
onClose={() => setConfirmRow(null)}
onConfirm={async() => {
if (!confirmRow) return;
try {
await adminApi.deletePassage(confirmRow);
addToast("success", "Passage·deleted.");
setConfirmRow(null);
refresh();
catch(e) {
const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
addToast("error", msg?? "Delete·failed.");
setConfirmRow(null);
}
}}
/>
</div>
);