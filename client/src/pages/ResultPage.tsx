import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "@/lib/api";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import XpAwardOverlay from "@/components/XpAwardOverlay";
import AchievementToast from "@/components/AchievementToast";
import VideoAdModal from "@/components/VideoAdModal";
import { useVideoInterstitial } from "@/hooks/useVideoInterstitial";
import { useAdsConfig } from "@/hooks/useAdsConfig";
import {
  API_ROUTES,
  type GamificationReward,
  type SessionScore,
  SUBJECT_AREAS,
  SUBJECT_META,
  type SubjectArea
} from "@/upcat/shared";

interface ReviewSession {
  _id: string;
  status: string;
  config: { totalQuestions: number; timeLimit: number };
  score: SessionScore;
  startedAt: string | null;
  completedAt: string | null;
  totalQuestions: number;
}

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [questions, setQuestions] = useState<{ timeSpent: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<GamificationReward | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [pendingReviewNavigation, setPendingReviewNavigation] = useState(false);
  const interstitial = useVideoInterstitial();
  const [config: adsConfig] = useAdsConfig();

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get(API_ROUTES.EXAM.REVIEW(sessionId));
        if (cancelled) return;
        setSession(data.data.session);
        setQuestions(data.data.questions ?? []);
        // Replay the gamification reward (stashed during submit).
        const key = `upcat.gamification.${sessionId}`;
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as GamificationReward;
          sessionStorage.removeItem(key);
          setReward(parsed);
          setShowOverlay(true);
          if (parsed.achievements?.length) {
            window.setTimeout(() => setShowAchievements(true), 1200);
          }
        }
      } catch {
        /* ignore */
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
  }, [sessionId]);

  function handleReviewAnswers() {
    if (!sessionId) return;
    if (interstitial.shouldShow("review_answers")) {
      interstitial.markShown();
      setPendingReviewNavigation(true);
      setVideoOpen(true);
      return;
    }
    navigate(`/review/${sessionId}`);
  }

  if (loading) return <div className="py-20 flex justify-center"><Spinner/></div>;

  if (error || !session) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-amber-600">{error ?? "Session not found"}</p>
        <button onClick={() => navigate("/dashboard")} className="btn-secondary mt-4">
          Back to Dashboard
        </button>
      </div>
    );
  }

const score = session.score;
const pct = score.percentage;
const tone = pct >= 80 ? "green" : pct >= 60 ? "yellow" : "red";
const ringColor = tone === "green" ? "#16a34a" : tone === "yellow" ? "#ca8a04" : "#dc2626";

const totalSecondsTaken =
    session.startedAt && session.completedAt
        ? Math.max(
            0,
            Math.floor(
                (new Date(session.completedAt).getTime() -
                new Date(session.startedAt).getTime()) / 1000,
            ),
        )
        : 0;
const totalSecondsAllowed = session.config.timeLimit * 60;
const avgPerQuestion = score.total > 0 ? Math.round(totalSecondsTaken / score.total) : 0;

return (
    <div className="mx-auto max-w-4xl px-4 py-10">
        <Seo title="Exam Results" description="View the results of your practice exam." noindex/>
        <VideoAdModal
            open={videoOpen}
            trigger="review_answers"
            config={adsConfig.video}
            testMode={adsConfig.testMode}
            onClose={() => {
                setVideoOpen(false);
                if (pendingReviewNavigation && sessionId) {
                    setPendingReviewNavigation(false);
                    navigate(`/review/${sessionId}`);
                }
            }}
        />
        {showOverlay && (
            <XpAwardOverlay reward={reward} onClose={() => setShowOverlay(false)}/>
        )}
        {showAchievements && reward?.achievements?.length ? (
            <AchievementToast
                events={reward.achievements}
                onClose={() => setShowAchievements(false)}
            />
        ) : null}
        <div className="text-center">
            <p className="text-sm font-medium text-primary-600">Exam Complete</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Your Results</h1>
            {session.completedAt && (
                <p className="mt-1 text-sm text-gray-500">
                    Completed {new Date(session.completedAt).toLocaleString()}
                </p>
            )}
        </div>

        {/* Big circular score */}
        <div className="mt-8 flex flex-col items-center">
            <CircularScore percentage={pct} color={ringColor} />
            <p className="mt-3 text-lg font-medium text-gray-700">
                {score.correct} / {score.total}. correct
            </p>
            <p className="text-sm text-gray-500">
                {pct >= 80 ? "Excellent work! 🥳" : pct >= 60 ? "Good effort. Keep practicing!" : "Don't give up. Review and try again."}
            </p>
        </div>

        {/* Score breakdown (if rawScore available) */}
        {score.rawScore !== undefined && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-center text-xs font-medium text-slate-600 uppercase">Score Breakdown</p>
                <p className="mt-2 text-center text-sm text-slate-700">
                    {score.correct} correct + {score.incorrect} incorrect + {score.unanswered} unanswered = <span className="font-semibold">{score.rawScore} points</span>
                </p>
            </div>
        )}
        {/* Summary cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Correct" value={score.correct} tone="green" />
            <Stat label="Incorrect" value={score.incorrect} tone="red" />
            <Stat label="Unanswered" value={score.unanswered} tone="gray" />
            <Stat label="Avg/Q" value={`${avgPerQuestion}s`} tone="indigo" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat
                label="Time Taken"
                value={formatDuration(totalSecondsTaken)}
                tone="indigo"
            />
            <Stat
                label="Time Allowed"
                value={formatDuration(totalSecondsAllowed)}
                tone="gray"
            />
        </div>
    </div>
);
{/* --- Per-subject breakdown ---------------- */}
<div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-gray-900">By Subject</h2>
    <div className="mt-4 space-y-4">
        {SUBJECT_AREAS.map((s) => (
            <SubjectBar key={s} subject={s} stats={score.bySubject[s]} />
        ))}
    </div>
</div>

{/* --- CTAs -------------------------------- */}
<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
    <button type="button" onClick={handleReviewAnswers} className="btn-secondary">
        Review Answers
    </button>
    <Link to="dashboard" className="btn-primary">
        Take Another Exam
    </Link>
</div>

{/* Use questions.length for a tiny footer note (avoids unused var). */}
<p className="mt-6 text-center text-xs text-gray-400">
    {questions.length} questions reviewed.
</p>;
}

function Stat({
    label,
    value,
    tone,
}: {
    label: string;
    value: string | number;
    tone: "green" | "red" | "gray" | "indigo";
}) {
    const styles: Record<string, string> = {
        green: "border-green-200 bg-green-50 text-green-700",
        red: "border-amber-200 bg-amber-50 text-amber-700",
        gray: "border-gray-200 bg-gray-50 text-gray-700",
        indigo: "border-primary-200 bg-primary-50 text-primary-700",
    };
    return (
        <div className={`rounded-lg border p-3 ${styles[tone]}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
    );
}

function SubjectBar({
    subject,
    stats,
}: {
    subject: SubjectArea;
    stats: { correct: number; total: number; percentage: number; };
}) {
    const meta = SUBJECT_META[subject];
    const pct = stats.percentage;
    const color = pct >= .80 ? "bg-green-500" : pct >= .60 ? "bg-yellow-500" : "bg-amber-500";
    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">{meta.icon} {meta.label}</span>
                <span className="text-gray-600">{(stats.correct / stats.total) * <strong>{pct}%</strong>}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all ${color}" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function CircularScore({ percentage, color }: { percentage: number; color: string }) {
    const size = 180;
    const stroke = 14;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (percentage / 100) * c;
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={(size / 2)}
                    cy={(size / 2)}
                    r={r}
                    stroke="#e5e7eb"
                    strokeWidth={stroke}
                    fill="none"
                />
                <circle
                    cx={(size / 2)}
                    cy={(size / 2)}
                    r={r}
                    stroke={color}
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
            </svg>
        </div>
    );
}
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}