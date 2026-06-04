/**
 * Phase 13 - Practice landing page (mode selector + due-card overview).
 *
 * Lets the user pick a practice mode and start a session. Shows the "X due today" badge and a recent-sessions strip for context.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API_ROUTES,
  PRACTICE_MODES,
  type PracticeMode,
  type PracticeStatsResponse,
  SUBJECT_AREAS,
  SUBJECT_META,
  type SubjectArea,
} from "@upcat/shared";
import { PRACTICE_MODE_DESCRIPTIONS, PRACTICE_MODE_LABELS, practiceApi } from "@/lib/practiceApi";
import { useToastStore } from "@/stores/toastStore";
import apiClient from "@/lib/api";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import VideoAdModal from "@/components/VideoAdModal";
import { useAdsConfig } from "@/hooks/useAdsConfig";
import { useVideoInterstitial } from "@/hooks/useVideoInterstitial";

const MODES_WITH_SUBJECT: PracticeMode[] = ["subject_focus"];
const MODES_WITH_NEW_CARDS: PracticeMode[] = ["mixed", "weak_areas", "subject_focus"];

export default function PracticePage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [stats, setStats] = useState<PracticeStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PracticeMode>("review");
  const [subjectArea, setSubjectArea] = useState<SubjectArea>(SUBJECT_AREAS[0]);
  const [maxQuestions, setMaxQuestions] = useState(20);
  const [newCardsLimit, setNewCardsLimit] = useState(5);
  const [randomCardsCount, setRandomCardsCount] = useState(5);
  const [generatingRandomCards, setGeneratingRandomCards] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const startAfterAdRef = useRef(false);
  const interstitial = useVideoInterstitial();
  const { config: adsConfig } = useAdsConfig();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await practiceApi.stats();
        if (!cancelled) setStats(s);
        // Check if user is new (no exams completed)
        try {
          const { data } = await apiClient.get(API_ROUTES.EXAM_SESSIONS);
          if (!cancelled) {
            const hasExams = (data.data.sessions ?? []).length > 0;
            setIsNewUser(!hasExams);
          }
        } catch {
          // Silent fallback
          setIsNewUser(false);
        }
      } catch {
        addToast("error", "Failed to load practice stats.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const totalDeck = stats?.totals.cards ?? 0;
  const dueToday = stats?.dueToday ?? 0;
  const subjectEnabled = MODES_WITH_SUBJECT.includes(mode);
  const newCardsEnabled = MODES_WITH_NEW_CARDS.includes(mode);
  const modeSummary =
    mode === "review"
      ? "Review sessions only pull cards already due for repetition."
      : mode === "random"
      ? "Random mode samples existing cards from your deck and ignores introduction pacing."
      : mode === "subject_focus"
      ? "Subject Focus keeps the session inside one subject and can introduce fresh cards gradually."
      : mode === "weak_areas"
      ? "Weak Areas prioritizes low-accuracy subjects, then introduces a few new cards if space remains."
      : "Mixed blends due review with a controlled number of new introductions";

  const canStart = useMemo(() => {
    if (mode === "review") return dueToday > 0;
    return totalDeck > 0;
  }, [mode, dueToday, totalDeck]);

  async function startPracticeSession() {
    setStarting(true);
    try {
      const res = await practiceApi.start({
        mode,
        subjectArea: mode === "subject_focus" ? subjectArea : undefined,
        maxQuestions,
        newCardsLimit,
      });
if (!res.sessionId || res.cards.length === 0) {
    addToast(
        "info",
        res.message ?? "No cards are due. Take an exam to grow your deck.",
    );
    return;
}
// Stash the start payload for the session page to consume on mount.
try {
    sessionStorage.setItem(
        `upcat.practice.${res.sessionId}`,
        JSON.stringify(res),
    );
} catch {
    /* sessionStorage full / disabled - session page will show fallback */
}
navigate(`/practice/${res.sessionId}`);
} catch (err) {
    const msg =
        err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to start practice session.";
    addToast("error", msg);
} finally {
    setStarting(false);
}

function handleStart() {
    if (starting) return;
    if (interstitial.shouldShow("start_practice")) {
        startAfterAdRef.current = true;
        interstitial.markShown();
        setVideoOpen(true);
        return;
    }
    void startPracticeSession();
}

async function handleGenerateRandomCards() {
    const count = Math.max(1, Math.min(50, Math.floor(randomCardsCount || 1)));
    setGeneratingRandomCards(true);
    try {
        const result = await practiceApi.bootstrap(count);
        addToast(
            "success",
            `Added ${result.cardsAdded} random card${result.cardsAdded === 1 ? "" : "s"} to your deck.`,
        );
        const refreshed = await practiceApi.stats();
        setStats(refreshed);
    } catch (err) {
        const msg =
            err && typeof err === "object" && "message" in err
                ? String((err as { message: unknown }).message)
                : "Failed to generate random cards.";
        addToast("error", msg);
    } finally {
        setGeneratingRandomCards(false);
    }
}

if (loading) {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Spinner />
        </div>
    );
}

return (
    <div className="mx-auto max-w-5xl px-4 py-8">
        <Seo
            title="Practice Test | UPCAT Simulator - Customize Your Review"
            description="Configure your own UPCAT practice test. Choose subjects, topics, difficulty, and timing. Learn at your own pace with instant feedback."
        />
        <VideoAdModal
            open={videoOpen}
            trigger="start_practice"
            config={adsConfig.video}
            testMode={adsConfig.testMode}
            onClose={() => {
                setVideoOpen(false);
                if (startAfterAdRef.current) {
                    startAfterAdRef.current = false;
                    void startPracticeSession();
                }
            }}
        />
        {isNewUser && (
            <div className="mb-6 rounded-lg border border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100 p-4 text-sm">
                <div className="flex gap-3">
                    <div className="text-lg">@</div>
                    <div className="flex-1">
                        <strong className="block text-primary-900">Welcome to Practice Mode!</strong>
                        <p className="mt-1 text-primary-700">
                            Start with <strong>Learn mode</strong> to build your deck with new questions, then
                            switch to <strong>Review mode</strong> to reinforce what you've learned. This approach helps you learn systematically before attempting a full exam.
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
);
<div>
  {/* ... */}
</div>

<header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <h1 className="text-3xl font-bold text-slate-900">Spaced Repetition Practice</h1>
    <p className="mt-1 text-sm text-slate-600">
      Review questions you've missed before — at the optimal moment, before you forget.
    </p>
  </div>
  <Link to="/practice/stats" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
    View deck stats →
  </Link>
</header>

{/* Overview tiles */}
<section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
  <Tile label="Cards in deck" value={totalDeck} accent="bg-maroon-50 text-maroon-700"/>
  <Tile label="Due today" value={dueToday} accent="bg-amber-50 text-amber-700"/>
  <Tile label="Mastered" value={stats?.totals.mastered ?? 0} accent="bg-emerald-50 text-emerald-700"/>
  <Tile label="Retention" value={`${(stats?.retentionPct.toFixed(1) ?? "0.0")}%`} accent="bg-sky-50 text-sky-700"/>
</section>

{/* Mode picker */}
<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" data-tour="practice-config" data-help="pt_subject_select">
  <h2 className="text-lg font-semibold text-slate-900">Choose a mode</h2>
  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {PRACTICE_MODES.map((m) => (
      <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg border p-4 text-left transition ${mode === m ? "border-maroon-500 bg-maroon-50 ring-2 ring-maroon-200" : "border-slate-200 bg-white hover:border-slate-300"}`}>
        <div className="font-semibold text-slate-900">{PRACTICE_MODE_LABELS[m]}</div>
        <div className="mt-1 text-xs text-slate-600">{PRACTICE_MODE_DESCRIPTIONS[m]}</div>
      </button>
    ))}
  </div>

  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
    <div className={`rounded-xl border p-4 transition ${subjectEnabled ? "border-maroon-200 bg-gradient-to-br from-white to-maroon-50/70 shadow-sm" : "border-slate-200 bg-slate-50/80"}`} data-help="pt_subtopic_select">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Subject</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Narrow the session to one subject when you want a deliberate drill instead of a mixed deck.
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${subjectEnabled ? "bg-maroon-100 text-maroon-700" : "bg-slate-200 text-slate-500"}`}>
          {subjectEnabled ? "Active" : "Subject Focus only"}
        </span>
      </div>

      <select value={subjectArea} disabled={!subjectEnabled} onChange={(e) => setSubjectArea(e.target.value as SubjectArea)} className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm shadow-sm focus:border-maroon-500 focus:ring-maroon-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">
        {SUBJECT_AREAS.map((sa) => (
          <option key={sa} value={sa}>
            {SUBJECT_META[sa]?.label ?? sa}
          </option>
        ))}
      </select>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {subjectEnabled ? "The selected subject limits both due cards and new introductions for this session." : "Switch to Subject Focus mode to choose a single subject for the session."}
      </p>
    </div>
  </div>
</section>
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
  <div className="text-sm font-semibold text-slate-900">How this mode behaves</div>
  <p className="mt-2 text-xs leading-5 text-slate-600">{modeSummary}</p>
  <div className="mt-4 space-y-2 text-xs text-slate-600">
    Max questions is the total cap for the whole session.
  </div>
  <div className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/80">
    New cards only fill leftover space after due cards are selected.
  </div>
</div>

<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" data-help="pt_question_count">
  <NumberField
    label="Max questions"
    value={maxQuestions}
    onChange={setMaxQuestions}
    min={5}
    max={50}
    description="Sets the total session size. Due cards are chosen first, then any allowed new cards fill the remaining slots."
    hint={`Recommended daily range: 15-30. Current mode can return up to ${maxQuestions} cards.`}
  />
  <NumberField
    label="New cards limit"
    value={newCardsLimit}
    onChange={setNewCardsLimit}
    min={0}
    max={20}
    disabled={!newCardsEnabled}
    description="Caps how many brand-new cards can be introduced after due cards are selected."
    hint={`newCardsEnabled ? "Use 0-3 for lighter review days and 5-10 when you want to expand the deck faster." : "This mode ignores new card introductions. Review only uses due cards, while Random samples existing cards directly."`}
  />
</div>

<div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950">
  <div className="font-semibold">Session sizing help</div>
  <div className="mt-2 grid gap-3 sm:grid-cols-2">
    <p className="leading-6 text-sky-900/90">
      <strong>Max questions</strong> is the hard ceiling for the session. If you set 20, the session will never exceed 20 cards.
    </p>
    <p className="leading-6 text-sky-900/90">
      <strong>New cards limit</strong> is not extra on top. It only controls how many unused cards may be introduced inside that same total cap.
    </p>
  </div>
</div>

<div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" data-help="pt_random_cards">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="flex-1">
      <div className="text-sm font-semibold text-emerald-900">Generate random cards</div>
      <p className="mt-1 text-xs leading-5 text-emerald-800/90">
        Add fresh cards to your deck anytime. This is always available so you can grow your deck without leaving this page.
      </p>
    </div>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={50}
        value={randomCardsCount}
        onChange={(e) => setRandomCardsCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
        className="w-20 rounded-md border border-emerald-300 bg-white px-2 py-2 text-center text-sm text-slate-900 focus:border-emerald-500"
      />
      <button
        type="button"
        onClick={handleGenerateRandomCards}
        disabled={generatingRandomCards}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed + disabled:bg-emerald-300"
      >
        {generatingRandomCards ? "Adding..." : "Add random cards"}
      </button>
    </div>
  </div>
</div>

<div className="mt-6 flex items-center justify-between" data-help="pt_presets">
  <p className="text-xs text-slate-500">
    {mode === "review"
      ? `${dueToday} card${dueToday === 1 ? "" : "s"} due right now. Pulling from ${totalDeck} card${totalDeck === 1 ? "" : "s"} in your deck.`
      : ""}
  </p>
  <button
    type="button"
    onClick={handleStart}
    disabled={!canStart || starting}
    className="rounded-md bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-maroon-700 disabled:cursor-not-allowed + disabled:bg-slate-300"
  >
    {starting ? "Starting..." : "Start practice"}
  </button>
</div>
</button>
</div>
</section>

{/* Recent sessions */}
{stats && stats.recentSessions.length > 0 &&
  (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent sessions</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Mode</th>
              <th className="px-4 py-2">Cards</th>
              <th className="px-4 py-2">Accuracy</th>
              <th className="px-4 py-2">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.recentSessions.map((s) => (
              <tr key={s.sessionId}>
                <td className="px-4 py-2 text-slate-700">{new Date(s.completedAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-700">{PRACTICE_MODE_LABELS[s.mode]}</td>
                <td className="px-4 py-2 text-slate-700">{s.totalAnswered}</td>
                <td className="px-4 py-2 font-medium text-slate-900">{(s.accuracyPct.toFixed(0))}%</td>
                <td className="px-4 py-2 text-slate-500">{Math.round(s.durationMs / 60_000)}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Tile({
  label,
  value,
  accent
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 inline-flex items-baseline rounded-md px-2 py-0.5 text-2xl font-bold ${accent}`}>
        {value}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  description,
  hint,
  disabled = false
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  description: string;
  hint: string;
  disabled?: boolean;
}) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className={`rounded-2xl border p-4 transition ${disabled ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-200 bg-white shadow-sm"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
        </div>
<div className="mt-4 flex items-center gap-3">
    <button type="button" onClick={decrement} disabled={disabled || value <= min} 
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-maroon-300 hover:text-maroon-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100" 
        >-</button>
    <label className="flex-1">
        <span className="sr-only">{label}</span>
        <input type="number" value={value} min={min} max={max} disabled={disabled} onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }} 
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-900 shadow-sm focus:border-maroon-500 focus:ring-maroon-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" />
    </label>
    <button type="button" onClick={increment} disabled={disabled || value >= max} 
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-maroon-300 hover:text-maroon-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100" 
        >+</button>
</div>
<p className={`mt-3 text-xs leading-5 ${disabled ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
</div>);