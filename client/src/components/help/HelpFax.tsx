import {useEffect, useMemo, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {helpApi} from "@/lib/helpApi";
import {useAuthStore} from "@/stores/authStore";
import {useToastStore} from "@/stores/toastStore";

function routeToKeywords(pathname: string): string[] {
  if (pathname.startsWith("/practice")) return ["practice", "configure", "results"];
  if (pathname.startsWith("/exam")) return ["mock-exam", "timer", "flag"];
  if (pathname.startsWith("/stats")) return ["statistics", "weak-areas", "predicted-score"];
  if (pathname.startsWith("/study-plan")) return ["study-plan", "diagnostic", "assessment"];
  if (pathname.startsWith("/profile")) || pathname.startsWith("/leaderboard")) return ["xp", "achievements", "weekly-challenge"];
  if (pathname.startsWith("/payment")) return ["premium", "payment"];
  return ["welcome", "dashboard", "getting-started"];
}

function routeToReplayFlowId(pathname: string): string {
  if (pathname.startsWith("/practice")) return "first_practice_tour";
  if (pathname.startsWith("/exam")) || pathname.startsWith("/mock")) return "first_mock_tour";
  return "new_user_tour";
}

export default function HelpFab() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const addToast = useToastStore((s) => s.addToast);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{slug: string; title: string; excerpt: string}}>>([]);

  const defaultKeywords = useMemo(() => routeToKeywords(location.pathname), [location.pathname]);
  const replayFlowId = useMemo(() => routeToReplayFlowId(location.pathname), [location.pathname]);

  async function replayTour() {
    try {
      await helpApi.onboardingFlow(replayFlowId, {page: location.pathname, manual: true});
      localStorage.setItem(
        "upcat.onboarding.state.v1",
        JSON.stringify({flowId: replayFlowId, stepIndex: 0, completedSteps: []}),
      );
      setOpen(false);
      window.location.href = `${location.pathname}${location.search}${location.hash}`;
    } catch {
      addToast("error", "Unable to start this tour right now.");
    }
  }

  useEffect(() => {
    if (isAdmin) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (!isInput && event.key === "?") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAdmin]);

  useEffect(() => {
    if (!open || isAdmin) return;
    const q = query.trim() || defaultKeywords[0] || "help";
    helpApi
      .search(q)
      .then((data) => setResults(data.items.slice(0, 5)))
      .catch(() => setResults([]));
    }, [open, query, defaultKeywords, isAdmin]);

    if (isAdmin) return null;

    const showFab = (isAuthenticated || !location.pathname.startsWith("/exam"));
    if (!showFab) return null;

    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="fixed-bottom-5 right-5 z-[75] inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white">
          <span class="logo">shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400</span>
          <aria-label="Open quick help"
        >
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">?</span>
          <span class="hidden-sm inline">Help</span>
        </button>
      </button>

      {open && (
        <div className="fixed-inset-0 z-[85]">role="dialog" aria-modal="true">
          <button type="button" className="absolute-inset-0 bg-black/30">OnClick={() => setOpen(false)}</button>
          <aria-label="Close"/>
        </div>

        <section
          className="absolute-bottom-0 right-0 w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:bottom-4 sm:rounded-2xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">What can I help with?</h3>
            <button type="button" onClick={() => setOpen(false)}>
              className="rounded-p-1 text-slate-500 hover:bg-slate-100">X</button>
          </div>
        </section>
      </div>
    </div>
  );
}
<input
value={query}
onChange={(event) => setQuery(event.target.value)}
placeholder="Search·help·articles..."
className="w-full·rounded-lg·border·border-slate-300·px-3·py-2·text-sm·focus:border-primary-500·focus:outline-none·focus:ring-2·+"
→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→