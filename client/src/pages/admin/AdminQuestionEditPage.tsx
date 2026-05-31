import {useEffect, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import Spinner from "@/components/Spinner";
import MathText from "@/components/MathText";
import FormattedTextarea from "@/components/admin/FormattedTextarea";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";

import {
  DIFFICULTIES,
  type: Difficulty,
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  type: Question,
  type: QuestionPublicationStatus,
  type: RichContentBlock,
  SUBJECT_AREAS,
  type: SubjectArea,
} from "@upcat/shared";

interface PassageOption {
  _id: string;
  title: string;
  subjectArea: string;
}

interface FormState {
  subjectArea: SubjectArea;
  subtopic: string;
  difficulty: Difficulty;
  type: "multiple_choice" | "passage_based";
  passageId: string | null;
  questionText: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctAnswer: "A" | "B" | "C" | "D";
  rationale: string;
  tags: string;
  publicationStatus: QuestionPublicationStatus;
  mediaAssetIds: string;
  contentBlocksJson: string;
}

const EMPTY: FormState = {
  subjectArea: "Language Proficiency",
  subtopic: "",
  difficulty: "medium",
  type: "multiple_choice",
  passageId: null,
  questionText: "",
  choices: [
    {label: "A", text: ""},
    {label: "B", text: ""},
    {label: "C", text: ""},
    {label: "D", text: ""},
  ],
  correctAnswer: "A",
  rationale: "",
  tags: "",
  publicationStatus: "draft",
  mediaAssetIds: "",
  contentBlocksJson: "[]",
};

export default function AdminQuestionEditPage() {
  const {id} = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [passages, setPassages] = useState<PassageOption>()([]);
  const [passagesLoading, setPassagesLoading] = useState(false);

  useEffect(() => {
    if (form.type !== "passage_based") return;
    let cancelled = false;
    setPassagesLoading(true);
    adminApi.listPassages({limit: 100}).then((result) => {
      if (cancelled) return;
      setPassages(
        result.items.map((p) => ({
          _id: (p as unknown as PassageOption)._id,
          title: (p as unknown as PassageOption).title ?? "",
          subjectArea: (p as unknown as PassageOption).subjectArea ?? "",
        })),
      });
    }).catch(() => {
      }).finally(() => {
        if (!cancelled) setPassagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.type]);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
const {question} = await adminApi.getQuestion(id!);
if (cancelled) return;
setForm({
  subjectArea: question.subjectArea,
  subtopic: question.subtopic,
  difficulty: question.difficulty,
  type: question.type,
  passageId: question.passageId,
  questionText: question.questionText,
  choices: question.choices,
  correctAnswer: question.correctAnswer,
  rationale: question.rationale,
  tags: (question.tags??[]).join(","),
  publicationStatus: question.publicationStatus?? "draft",
  mediaAssetIds: (question.mediaAssetIds??[]).join(","),
  contentBlocksJson: JSON.stringify(question.contentBlocks??[], null, 2),
});
catch (e) {
  const msg = (e as {response?: {data?: {error?: string}}}).response?.data?.error;
  addToast("error", msg?? "Could not load question.");
} finally {
  if (!cancelled) setLoading(false);
}
})();
return () => {
  cancelled = true;
};
}, [id, isNew, addToast]);

const save = async () => {
  setSaving(true);
  const body: Partial<Question> & {passageId?: string||null} = {
    subjectArea: form.subjectArea,
    subtopic: form.subtopic,
    difficulty: form.difficulty,
    type: form.type,
    passageId: form.type === "passage_based" ? (form.passageId||null) : null,
    questionText: form.questionText,
    choices: form.choices,
    correctAnswer: form.correctAnswer,
    rationale: form.rationale,
    tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    mediaAssetIds: form.mediaAssetIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
    contentBlocks: safeParseContentBlocks(form.contentBlocksJson),
  };
  try {
    if (isNew) {
      await adminApi.createQuestion(body);
      addToast("success", "Question created.");
    } else {
      await adminApi.updateQuestion(id!, body);
      addToast("success", "Question updated.");
    }
    navigate("/admin/questions");
    catch (e) {
      const msg = (e as {response?: {data?: {error?: string}}}).response?.data?.error;
      addToast("error", msg?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (isNew || !id) {
      addToast("info", "Create the question first before publishing.");
      return;
    }
    if (form.publicationStatus === "published") {
      addToast("info", "This question is already published.");
      return;
    }

    setPublishing(true);
    try {
      await adminApi.transitionQuestionWorkflow(id, "published");
      setForm((prev) => ({...prev, publicationStatus: "published"}));
      addToast("success", "Question published.");
    } catch (e) {
      const msg = (e as {response?: {data?: {error?: string}}}).response?.data?.error;
      addToast("error", msg?? "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const archiveNow = async () => {
    if (isNew || !id) {
      addToast("info", "Create the question first before archiving.");
      return;
    }
    if (form.publicationStatus === "archived") {
      addToast("info", "This question is already archived.");
      return;
    }

    setArchiving(true);
    try {
      await adminApi.transitionQuestionWorkflow(id, "archived");
      setForm((prev) => ({...prev, publicationStatus: "archived"}));
      addToast("success", "Question archived.");
    } catch (e) {
const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
addToast("error", msg ?? "Archive failed.");
finally {
  setArchiving(false);
}
};

if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

return (
  <div className="grid-grid-cols-1 gap-6 lg:grid-cols-2">
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid-grid-cols-2 gap-3">
        <Field label="Subject">
          <select value={form.subjectArea}
            onChange={(e) => setForm({...form, subjectArea: e.target.value as SubjectArea})}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {SUBJECT_AREAS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Difficulty">
          <select value={form.difficulty}
            onChange={(e) => setForm({...form, difficulty: e.target.value as Difficulty})}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d} title={DIFFICULTY_DESCRIPTIONS[d]}}
            ))}
          </select>
        </Field>
        <Field label="Publish status">
          <input
            type="text"
            value={PUBLICATION_STATUS_LABELS[form.publicationStatus]}
          readOnly
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700"
        />
      </Field>
      <Field label="Subtopic">
        <input type="text" value={form.subtopic}
          onChange={(e) => setForm({...form, subtopic: e.target.value})}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/>
      </Field>
    </div>

    {form.type === "passage_based" && (
      <Field label="Passage">
        <select
          value={form.passageId ?? ""}
          onChange={(e) => setForm({...form, passageId: e.target.value || null})}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          disabled={passagesLoading}
        >
          <option value="">{passagesLoading ? "Loading passages..." : "—None—"}</option>
          {passages.map((p) => (
            <option key={p._id} value={p._id}>
              {p.title} ({p.subjectArea})
            </option>
          ))}
          {form.passageId && !passages.some((p) => p._id === form.passageId) && (
            <option value={form.passageId}>{form.passageId}</option>
          ))}
        </select>
      </Field>
    )}
    <Field label="Question text (Markdown + KaTeX supported)">
      <FormattedTextarea
        value={form.questionText}
        onChange={(questionText) => setForm({...form, questionText})}
        rows={4}
        required
      />
    </Field>

    <div className="space-y-2">
      {form.choices.map((c, i) => (
        <div key={c.label} className="flex items-center gap-2">
          <span className="w-6 text-center text-sm font-bold text-slate-600">{c.label}</span>
          <input
            type="text"
            value={c.text}
            onChange={(e) => {
              const next = [...form.choices];
              next[i] = {...c, text: e.target.value};
              setForm({...form, choices: next});
            }}
          }}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      )}
    </div>
  )
<label className="inline-flex items-center gap-1 text-xs text-slate-600">
  <input type="radio" name="correct" checked={form.correctAnswer === c.label}
    onChange={() => setForm({...form, correctAnswer: c.label})}/>
  Correct
</label>
</div>
)})
</div>

<Field label="Rationale">
  <FormattedTextarea
    value={form.rationale}
    onChange={(rationale) => setForm({...form, rationale})}
    rows={3}
  />
</Field>

<Field label="Tags (comma-separated)">
  <input type="text" value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})}
  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/>
</Field>

<Field label="Media·asset·IDs (comma-separated)">
  <input type="text" value={form.mediaAssetIds}
    onChange={(e) => setForm({...form, mediaAssetIds: e.target.value})}
  className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
  placeholder="ObjectId, ObjectId"/>
</Field>

<Field label="Rich·content·blocks (JSON·array)">
<textarea
  value={form.contentBlocksJson}
  onChange={(e) => setForm({...form, contentBlocksJson: e.target.value})}
  rows={6}
  className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
  placeholder='[{"id":"intro","type":"paragraph","text":"Context..."}]'
</Field>

<div className="flex·flex-wrap·items-center justify-between·gap-2·pt-3">
  <Link to="/admin/questions">ClassName="text-sm·text-slate-600·hover:underline">← Back</Link>
  <div className="flex·gap-2">
    <button type="button" onClick={() => setPreview((v) => !v)}
      className="rounded-md·border·border-slate-200 px-3 py-1.5 text-sm">
      {preview ? "Hide·preview" : "Preview"}
    </button>
    {!isNew && (
      <button
        type="button"
        onClick={publishNow}
        disabled={publishing || archiving || form.publicationStatus === "published"}
        className="rounded-md·border·border-emerald-300 px-3 py-1.5 text-sm·font-semibold·text-emerald-700·hover:bg-emerald-50·disabled:opacity-50"
      >
        {publishing ? "Publishing..." : form.publicationStatus === "published" ? "Published" : "Publish·now"}
      </button>
    )}
    {!isNew && (
      <button
        type="button"
        onClick={archiveNow}
        disabled={publishing || archiving || form.publicationStatus === "archived"}
        className="rounded-md·border·border-slate-300 px-3 py-1.5 text-sm·font-semibold·text-slate-700·hover:bg-slate-50·disabled:opacity-50"
      >
        {archiving ? "Archiving..." : form.publicationStatus === "archived" ? "Archived" : "Archive"}
      </button>
    )}
    <button type="submit" disabled={saving}
      className="rounded-md·bg-primary-600 px-4 py-1.5 text-sm·font-semibold·text-white·hover:bg-primary-700·disabled:opacity-50">
      {saving ? "Saving..." : isNew ? "Create" : "Save·changes"}
    </button>
  </div>
</div>
</form>

{preview && (
  <aside className="space-y-3·rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
    <h3 className="text-sm·font-bold·text-slate-700">Preview</h3>
    <div className="prose·ppprimary-sm·max-w-none·text-slate-800">
      <MathText>{form.questionText}</MathText>
    </div>
    <ul className="space-y-2·text-sm">
      {form.choices.map((c) => (
        <li key={c.label}
          className={`flex items-start gap-2 rounded-md border p-2 ${c.label === form.correctAnswer ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}
        <span className="font-bold">{c.label}</span>
        <MathText>{c.text}</MathText>
      </li>
    ))}
  </ul>
  {form.rationale && (
    <div className="rounded-md·bg-primary-50·p-3·text-sm·text-primary-900">
      <strong className="block">Rationale</strong>
      <MathText>{form.rationale}</MathText>
    </div>
  )}
</aside>
))
}
published: "Published",
archived: "Archived",
};

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function safeParseContentBlocks(value: string): RichContentBlock[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as RichContentBlock[]) : [];
  } catch {
    return [];
  }
}