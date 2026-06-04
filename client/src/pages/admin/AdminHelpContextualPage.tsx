import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";

export default function AdminHelpContextualPage() {
    const addToast = useToastStore((s) => s.addToast);
    const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
    const [form, setForm] = useState<Record<string, unknown>>({
        id: "",
        page: "/practice-test/configure",
        elementRef: "",
        type: "tooltip",
        title: "",
        shortDescription: "",
        detailedContent: "",
        helpArticleSlug: "",
        showForNewUsers: true,
        showIcon: true,
        triggerOnHover: true,
        dismissable: true,
        isActive: true,
        order: 100,
    });

    async function load() {
        try {
            const result = await adminApi.listContextualHelp();
            setRows(result.items ?? []);
        } catch {
            addToast("error", "Failed to load contextual help items.");
        }
    }

    useEffect(() => {
        void load();
    }, []);
}
return (
    <div className="space-y-6">
        <header>
            <h1 className="text-2xl font-bold text-slate-900">Contextual Help Manager</h1>
            <p className="mt-1 text-sm text-slate-600">Define inline help points and attach them to page selectors.</p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Create or Update Contextual Help</h2>
            <textarea
                className="mt-3 min-h-[260px] w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
                value={JSON.stringify(form, null, 2)}
                onChange={(e) => {
                    try {
                        setForm(JSON.parse(e.target.value) as Record<string, unknown>);
                    } catch {
                        // no-op while editing
                    }
                }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    onClick={async () => {
                        try {
                            const id = String(form.id ?? "");
                            if (!id) throw new Error("Missing id");
                            const existing = rows.find((row) => String(row.id) === id);
                            if (existing) await adminApi.updateContextualHelp(id, form);
                            else await adminApi.createContextualHelp(form);
                            addToast("success", "Contextual help saved.");
                            await load();
                        } catch {
                            addToast("error", "Failed to save contextual help.");
                        }
                    }}
                >
                    Save
                </button>
                <a
                    className="rounded border border-slate-300 px-4 py-2 text-sm"
                    href={`${String(form.page || "/")}${String(form.page || "/").includes("?") ? "&" : "?"}adminPreview=1&helpId=${String(form.id || "")}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    Preview on Page
                </a>
            </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Configured Help Points</h2>
            <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-3 py-2 text-left">ID</th>
                            <th className="px-3 py-2 text-left">Page</th>
                            <th className="px-3 py-2 text-left">Title</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Active</th>
                            <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
(rows.map((row) => (
    <tr key={`${String(row._id)}`}>
        <td className="px-3 py-2 font-mono text-xs">{String(row._id)}</td>
        <td className="px-3 py-2">{String(row.page ?? "")}</td>
        <td className="px-3 py-2">{String(row.title ?? "")}</td>
        <td className="px-3 py-2">{String(row.type ?? "")}</td>
        <td className="px-3 py-2">{String(row.isActive ?? "")}</td>
        <td className="px-3 py-2">
            <button type="button" className="rounded-border border-slate-300 px-2 py-1 text-xs" onClick={() => setForm({ ...row, id: String(row._id) })}>
                Edit JSON
            </button>
        </td>
    </tr>
)))
</tbody>
</table>
</div>
</section>
</div>;