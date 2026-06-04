import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { studyPlanApi } from "@/lib/studyPlanApi";
import apiClient from "@/lib/api";
import { API_ROUTES } from "@/upcat/shared";
import { useExamStore } from "@/stores/examStore";
import { useToastStore } from "@/stores/toastStore";
import Seo from "@/components/Seo";

export default function StudyPlanAnalyticsPage() {
  const navigate = useNavigate();
  const resetExam = useExamStore((s) => s.reset);
  const addToast = useToastStore((s) => s.addToast);
  const [planId, setPlanId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, any> | null>(null);
  const [startingMockExam, setStartingMockExam] = useState(false);

  useEffect(() => {
    let mounted = true;
    void studyPlanApi.getActivePlan(true).then((plan: any) => {
      const activeId = plan?._id ?? null;
      if (!mounted) return;
      setPlanId(activeId);
      if (activeId) {
        void studyPlanApi.getAnalytics(activeId).then((data) => {
          if (mounted) setAnalytics(data as any);
        });
      }
    }).catch(() => {
      if (mounted) setAnalytics(null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartMockExam = async () => {
    setStartingMockExam(true);
    try {
      resetExam();
      // Start a mock exam with full configuration (all subjects, balanced difficulty)
      const body = {
        totalQuestions: 200, // Full UPCAT length
        timeLimit: 240, // 4 hours
        difficultyMix: { easy: 30, medium: 50, hard: 20 },
      };
      const { data } = await apiClient.post(API_ROUTES.EXAM.START, body);
      navigate(`/exam/${data.data.sessionId}`);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || "Could not start mock exam";
      addToast("error", msg);
      setStartingMockExam(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <Seo title="Study Plan Analytics" description="Track progress, assessments, and readiness." />
      <h1 className="text-2xl font-bold text-slate-900">Study Plan Analytics</h1>
      {!planId ? <p className="text-sm text-slate-500">No active plan.</p> : null}
      {!analytics ? <p className="text-sm text-slate-500">Loading analytics...</p> : null}

      {analytics && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Tile label="Completion" value={`${analytics.overview?.progressPercent ?? 0}%`}/>
            <Tile label="Assessment Avg" value={`${analytics.performance?.averageAssessmentScore ?? 0}%`}/>
            <Tile label="Readiness" value={`${analytics.readinessEstimate?.overall ?? 0}%`}/>
          </section>

          {analytics.readinessEstimate?.recommendation === (
            <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <h2 className="font-semibold text-slate-900">Readiness Recommendation</h2>
              <p className="mt-2 text-s text-slate-800">{analytics.readinessEstimate.recommendation}</p>
              {analytics.readinessEstimate.recommendation.toLowerCase().includes("mock-exam") && (
                <button
                  type="button"
                  onClick={() => void handleStartMockExam()}
                  disabled={startingMockExam}
                  className="mt-4 inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {startingMockExam ? "Starting Mock Exam..." : "Take Mock Exam"}
                </button>
              )}
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">Subject Progress</h2>
            <div className="mt-3 space-y-2">
              {(analytics.subjectProgress ?? []).map((s: any) => (
                <div key={s.subject} className="rounded border border-slate-200 p-2 text-sm">
                  <div className="flex justify-between">
                    <span>{s.subject}</span>
                    <span>{s.modulesCompleted}/{s.modulesTotal}</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, (s.modulesCompleted / Math.max(1, s.modulesTotal)) * 100))}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
function Tile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}