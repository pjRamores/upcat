import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import { studyPlanApi } from "@/lib/studyPlanApi";

export default function StudyPlanCalendarPage() {
    const [rows, setRows] = useState<Array<{
        date: string;
        title: string;
        status: string;
        module: string;
        assessmentDay: boolean
    }>>([]);

    useEffect(() => {
        void studyPlanApi.getCalendar().then((r) => setRows(r.days as any[])).catch(() => setRows([]));
    }, []);

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <Seo title="Study Plan Calendar" description="Your study day timeline and assessments." />
            <h1 className="text-2xl font-bold text-slate-900">Study Plan Calendar</h1>
            <p className="mt-1 text-sm text-slate-600">Monthly-like timeline of your study sessions, rest gaps, and assessment days.</p>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Session</th>
                            <th className="px-4 py-3">Module</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={`${row.date}-${row.title}`} className="border-t border-slate-100">
                                <td className="px-4 py-3">{row.date}</td>
                                <td className="px-4 py-3">{row.title}{row.assessmentDay ? " 📅" : ""}</td>
                                <td className="px-4 py-3">{row.module}</td>
                                <td className="px-4 py-3">{row.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}