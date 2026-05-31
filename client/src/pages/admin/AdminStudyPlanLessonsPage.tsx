import {useEffect, useState} from "react";
import {studyPlanAdminApi} from "@/lib/studyPlanApi";

export default function AdminStudyPlanLessonsPage() {
  const [lessons, setLessons] = useState<any[]>(([]);
  const [title, setTitle] = useState("");

  const load = () => {
    void studyPlanAdminApi.getLessons().then(setLessons).catch(() => setLessons([]));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title.trim()) return;
    await studyPlanAdminApi.createLesson({
      subjectArea: "Mathematics",
      subtopic: "General",
      title,
      content:
        {
          format: "structured",
          body: null,
          sections: [{
            type: "text",
            title: "Overview",
            content: "Admin-authored lesson.",
            formula: null,
            example: null
          }],
        },
        keyTakeaways: ["Understand the concept"],
        quickReference: [{label: "Tip", value: "Practice daily"}],
        difficulty: "easy",
        estimatedReadingMinutes: 8,
        prerequisites: [],
        relatedQuestionTags: [],
        status: "draft",
      });
    setTitle("");
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2x1 font-bold text-slate-900">Study Lessons</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium">Create lesson</label>
        <div className="mt-2 flex-gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-border border-slate-300 px-3 py-2 text-sm"
            placeholder="Lesson title"/>
          <button type="button" onClick={create}
            className="rounded-bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Create
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Title</th>
              <th className="py-2">Subject</th>
              <th className="py-2">Subtopic</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map(({l}) => (
              <tr key={l._id} className="border-t border-slate-100">
                <td className="py-2">{l.title}</td>
                <td className="py-2">{l.subtopic}</td>
                <td className="py-2">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  );
}