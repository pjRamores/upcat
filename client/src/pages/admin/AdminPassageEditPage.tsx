import {useEffect, useState, type ReactNode} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import Spinner from "@/components/Spinner";
import FormattedTextarea from "@/components/admin/FormattedTextarea";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import {DIFFICULTY_LABELS, type Passage, type Question, SUBJECT_AREAS, type SubjectArea} from "@upcat/shared";

interface FormState {
    title: string;
    content: string;
    source: string;
    subjectArea: SubjectArea;
}

const EMPTY: FormState = {title: "", content: "", source: "", subjectArea: "Reading Comprehension"};

export default function AdminPassageEditPage() {
    const {id} = useParams<{ id: string }>();
    const isNew = !id || id === "new";
    const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [linked, setLinked] = useState<Question[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isNew) return;
        let cancelled = false;
        (async () => {
            try {
                const {passage, questions} = await adminApi.getPassage(id!);
                if (cancelled) return;
                setForm({
                    title: passage.title,
                    content: passage.content,
                    source: passage.source ?? "",
                    subjectArea: passage.subjectArea,
                });
                setLinked(questions ?? []);
            } catch (e) {
                const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
                addToast("error", msg ?? "Could not load passage.");
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
        try {
            const body: Partial<Passage> = {
                title: form.title.trim(),
                content: form.content.trim(),
                source: form.source.trim(),
                subjectArea: form.subjectArea,
            };
            if (isNew) await adminApi.createPassage(body);
            else await adminApi.updatePassage(id!, body);
            addToast("success", "Saved.");
            navigate("/admin/passages");
        } catch (e) {
            const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
            addToast("error", msg ?? "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Spinner/></div>;

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
                  onSubmit={(e) => {
                        e.preventDefault();
                        save();
                  }}>
                <Field label="Title">
                    <input type="text" required value={form.title}
                           onChange={(e) => setForm({ ...form, title: e.target.value})}
                           className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"/>
                </Field>
                <Field label="Subject">
                    <select value={form.subjectArea}
                            onChange={(e) => setForm({ ...form, subjectArea: e.target.value as SubjectArea})}
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                        {SUBJECT_AREAS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </Field>
                <Field label="Source (optional)">
                    <input type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                           className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"/>
                </Field>
                <Field label="Content">
                    <FormattedTextarea
                        value={form.content}
                        onChange={(content) => setForm({ ...form, content})}
                        rows={14}
                        required
                    />
                </Field>
                <div className="flex justify-between">
                    <Link to="/admin/passages" className="text-sm text-slate-600 hover:underline">← Back</Link>
                    <button type="submit" disabled={saving || !form.title.trim() || !form.content.trim()}
                            className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                        {saving ? "Saving..." : isNew ? "Create" : "Save changes"}
                    </button>
                </div>
            </form>
            <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700">Linked questions</h3>
                {linked.length === 0 ? (
                    <p className="text-sm text-slate-400">No questions linked.</p>
                ) : (
                    <ul className="space-y-2 text-sm">
                        {linked.map((q) => (
                            <li key={q._id} className="rounded-md border border-slate-200 p-2">
                                <Link to={`/admin/questions/${q._id}`}
                                      className="line-clamp-2 hover:text-primary-700">{q.questionText.slice(0, 120)}</Link>
                                <p className="mt-1 text-xs text-slate-500">{DIFFICULTY_LABELS[q.difficulty]} -
                                    ans {q.correctAnswer}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </aside>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
            {children}
        </label>
    );
}
