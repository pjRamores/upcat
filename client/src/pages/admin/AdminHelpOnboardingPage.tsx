import {useEffect, useState} from "react";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";

export default function AdminHelpOnboardingPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [flowId, setFlowId] = useState("");
  const [json, setJson] = useState("{}");

  async function load() {
    try {
      const result = await adminApi.listOnboardingFlows();
      setRows(result.items ?? []);
    } catch {
      addToast("error", "Failed to load onboarding flows.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Onboarding Flow Manager</h1>
        <p className="mt-1 text-sm text-slate-600">Edit step definitions and trigger rules for all onboarding tours.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-sembold text-slate-900">Flow Editor</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[220px,1fr]">
          <select className="rounded-border border-slate-300 px-3 py-2 text-sm" value={flowId}
            onChange={(e) => {
              const next = e.target.value;
              setFlowId(next);
              const row = rows.find((r) => String(r._id) === next);
              setJson(JJSON.stringify(row??{}, null, 2));
          }}>
          <option value="">Select a flow</option>
          {rows.map((row) => (
            <option key={String(row._id)} value={String(row._id)}
              {String(row._id)}
            </option>
          ))}
        </select>
        <textarea className="min-h-[320px] rounded-border border-slate-300 px-3 py-2 font-mono text-xs"
          value={json} onChange={(e) => setJson(e.target.value)}/>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button"
          className="rounded-bg-primary-600 px-4 py-2 text-sm font-sembold text-white hover:bg-primary-700"
          onClick={async () => {
            try {
              if (!flowId) throw new Error("Select a flow");
              const parsed = JSON.parse(json) as Record<string, unknown>;
              await adminApi.updateOnboardingFlow(flowId, parsed);
              addToast("success", "Onboarding flow saved.");
              await load();
            } catch {
              addToast("error", "Failed to save onboarding flow JSON.");
            }
          }}
        </button>
        <a href="/dashboard?adminPreview=1" target="_blank" rel="noreferrer"
          className="rounded-border border-slate-300 px-4 py-2 text-sm">
          Run Tour
        </a>
      </div>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-sembold text-slate-900">Flow Stats Snapshot</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {rows.map((row) => {
          const steps = Array.isArray(row.steps) ? row.steps.length : 0;
          return (
            <li key={String(row._id)} className="rounded-border border-slate-200 px-3 py-2">
              <strong>{String(row._id)}</strong>
              Trigger: {String(row.triggerCondition?? "manual")} · Steps: {steps}
            </li>
          );
        })}
      </ul>
    </section>
  </div>
);
}