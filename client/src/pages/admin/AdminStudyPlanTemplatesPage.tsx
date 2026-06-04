import { useEffect, useState } from "react";
import { studyPlanAdminApi } from "@/lib/studyPlanApi";

export default function AdminStudyPlanTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState("");

  const load = () => {
    void studyPlanAdminApi.getTemplates().then(setTemplates).catch(() => setTemplates([]));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    await studyPlanAdminApi.createTemplate({
      name,
      description: "Admin-created study plan template",
      targetDuration: 6,
      targetHoursPerDay: 2,
      structure: { phases: [] },
      adaptationRules: {
        weakAreaExtraTime: 50,
        strongAreaReduction: -30,
        failedAssessmentAction: "add_remedial",
        minimumModuleDays: 1,
        maximumModuleDays: 5,
      },
    });
    setName("");
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Study Plan Templates</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium">Create template</label>
        <div className="mt-2 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button type="button" onClick={create}>
            <span className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Create</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Duration</th>
              <th className="py-2">Status</th>
              <th className="py-2">Active Plans</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id ?? t._id} className="border-t border-slate-100">
                <td className="py-2">{t.name}</td>
                <td className="py-2">{t.targetDuration} weeks</td>
                <td className="py-2">{t.status}</td>
                <td className="py-2">{t.activePlansUsingIt ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}