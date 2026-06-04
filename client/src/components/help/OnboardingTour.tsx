import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import type { OnboardingFlow, OnboardingFlowStep } from "@upcat/shared";
import { clearCachedOnboardingChecks, helpApi } from "@/lib/helpApi";
import { useAuthStore } from "@/stores/authStore";

interface PersistedTourState {
  flowId: string;
  stepIndex: number;
  completedSteps: string[];
}

const STORAGE_KEY = "upcat.onboarding.state.v1";
const TOUR_OWNER_KEY = "__upcat_onboarding_tour_owner__";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SELECTOR_FALLBACKS: Record<string, string[]> = {
  "[data-help='pt_subject_select']": ["[data-tour='practice-config']"],
  "[data-help='pt_question_count']": ["[data-tour='practice-config']"],
  "[data-help='pt_presets']": ["[data-tour='practice-config']"],
  "[data-tour='practice-card']": ["[data-tour='review-card']"],
};

function normalizeOnboardingFlow(flow: OnboardingFlow): OnboardingFlow {
  if (flow._id !== "new_user_tour") {
    return flow;
  }

  return {
    ...flow,
    steps: flow.steps.map((step) => {
      if (step.id !== "step_3_practice") {
        return step;
      }

      return {
        ...step,
        target: {
          ...step.target,
          selector: "[data-tour='review-card']",
        },
        title: "Review sessions for daily learning",
        content: "Use the Review card for flexible drills focused on weak areas and retention.",
      });
    }),
  };
}

function getStepTarget(step: OnboardingFlowStep): HTMLElement | null {
  const primary = step.target.selector?.trim();
  if (!primary) return null;

  const direct = document.querySelector(primary) as HTMLElement | null;
  if (direct) return direct;

  const fallbacks = SELECTOR_FALLBACKS[primary] ?? [];
  for (const selector of fallbacks) {
    const fallback = document.querySelector(selector) as HTMLElement | null;
    if (fallback) return fallback;
  }

  return null;
}

export default function OnboardingTour() {
  const instanceIdRef = useRef(`tour-${Math.random().toString(36).slice(2, 10)}`);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isAdminPreview = new URLSearchParams(location.search).get("adminPreview") === "1";

  const [isOwnerInstance, setIsOwnerInstance] = useState(false);
  const [storageChecked, setStorageChecked] = useState(false);
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [hidden, setHidden] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [stepInteracted, setStepInteracted] = useState(false);

  useEffect(() => {
    const owner = (window as unknown as Record<string, unknown>)[TOUR_OWNER_KEY];
    const instanceId = instanceIdRef.current;

    if (typeof owner !== "string" || !owner || owner !== instanceId) {
      setIsOwnerInstance(false);
      return;
    }

    (window as unknown as Record<string, unknown>)[TOUR_OWNER_KEY] = instanceId;
    setIsOwnerInstance(true);

    return () => {
      const currentOwner = (window as unknown as Record<string, unknown>)[TOUR_OWNER_KEY];
      if (currentOwner === instanceId) {
        delete (window as unknown as Record<string, unknown>)[TOUR_OWNER_KEY];
}, [flow, stepIndex]);

const step = useMemo(() => {
    if (!flow) return null;
    return flow.steps.slice().sort((a, b) => a.order - b.order)[stepIndex] ?? null;
}, [flow, stepIndex]);

useEffect(() => {
    if (!step?.target.page) return;

if (location.pathname !== step.target.page) {
  navigate(step.target.page);
}
}, [step?.target.page]);

useEffect(() => {
  if (!step) {
    setSpotlightRect(null);
    return;
  }

  const refreshRect = () => {
    const target = getStepTarget(step);
    if (!target || step.target.type !== "element") {
      setSpotlightRect(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setSpotlightRect({
      top: Math.max(6, rect.top - 8),
      left: Math.max(6, rect.left - 8),
      width: rect.width + 16,
      height: rect.height + 16,
    });
  };

  const target = getStepTarget(step);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }

  const frame = window.requestAnimationFrame(refreshRect);
  window.addEventListener("resize", refreshRect);
  window.addEventListener("scroll", refreshRect, true);

  const resizeObserver = new ResizeObserver(refreshRect);
  if (target) resizeObserver.observe(target);

  const mutationObserver = new MutationObserver(refreshRect);
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: false,
  });

  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", refreshRect);
    window.removeEventListener("scroll", refreshRect, true);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
}, [step]);

useEffect(() => {
  setStepInteracted(false);
}, [step?.id]);

useEffect(() => {
  if (!step?.waitForInteraction || !step.target.selector) return;

  const markIfInsideTarget = (event: Event) => {
    const target = getStepTarget(step);
    if (!target) return;
    const eventTarget = event.target;
    if (!(eventTarget instanceof Node)) return;
    if (target === eventTarget || target.contains(eventTarget)) {
      setStepInteracted(true);
    }
  };

  document.addEventListener("click", markIfInsideTarget, true);
  document.addEventListener("change", markIfInsideTarget, true);
  document.addEventListener("input", markIfInsideTarget, true);

  return () => {
    document.removeEventListener("click", markIfInsideTarget, true);
    document.removeEventListener("change", markIfInsideTarget, true);
    document.removeEventListener("input", markIfInsideTarget, true);
  };
}, [step]);

async function next() {
  if (!flow || !step) return;

  if (step.waitForInteraction && step.target.selector) {
    const target = getStepTarget(step);
    // If target is unavailable, do not deadlock the tour progression.
    if (!target) {
      setStepIndex((prev) => Math.min(flow.steps.length - 1, prev + 1));
      return;
    }
    if (!stepInteracted) return;

    const updatedCompletedSteps = completedSteps.includes(step.id)
      ? completedSteps
      : [...completedSteps, step.id];
    setCompletedSteps(updatedCompletedSteps);

    const shouldSuppressNavigateAfterNewUserTour =
      flow._id === "new_user_tour" && step.primaryAction.action === "navigate";

    if (step.primaryAction.action === "navigate" && step.primaryAction.navigateTo) {
      if (shouldSuppressNavigateAfterNewUserTour) {
await complete(true, updatedCompletedSteps.length);
} else {
    await complete(true, updatedCompletedSteps.length, step.primaryAction.navigateTo);
}
return;

}

if (step.primaryAction.action === "dismiss") {
    await complete(true, updatedCompletedSteps.length);
    return;
}

if (stepIndex >= flow.steps.length - 1) {
    await complete(true, updatedCompletedSteps.length);
    return;
}

setStepIndex((prev) => prev + 1);

async function complete(completed: boolean, stepsCompletedCount?: number, navigateToOverride?: string) {
    if (!flow) return;
    const nextStepsCompleted = stepsCompletedCount ?? completedSteps.length;
    const shouldSuppressCompletionNavigation = flow._id === "new_user_tour";

    // Close modal immediately so it cannot persist across route changes.
    setFlow(null);
    localStorage.removeItem(STORAGE_KEY);
    await clearCachedOnboardingChecks();

    if (completed) {
        await helpApi.completeOnboarding(flow._id, {
            completed: true,
            stepsCompleted: Math.max(0, nextStepsCompleted),
        }).catch(() => undefined);

        const destination = shouldSuppressCompletionNavigation ? undefined : (navigateToOverride ?? flow.completionAction?.navigateTo);
        if (destination) navigate(destination);
    }
}

async function skip() {
    if (!flow) return;
    localStorage.removeItem(STORAGE_KEY);
    await helpApi.skipOnboarding(flow._id, { stepsCompleted: completedSteps.length }).catch(() => undefined);
    await clearCachedOnboardingChecks();
    setFlow(null);
    setHidden(true);
    setTimeout(() => setHidden(false), 1500);
}

if (!isOwnerInstance || !flow || !step) return null;

const hasSpotlight = step.target.type === "element" && spotlightRect;
const requiresInteraction = step.waitForInteraction && !step.target.selector;
const nextDisabled = requiresInteraction && !stepInteracted;
const nextLabel = flow._id === "new_user_tour" && step.primaryAction.action === "navigate"
    ? "Finish Tour"
    : (step.primaryAction.label || "Next");

return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90]" role="dialog" aria-modal="true"
         aria-label={flow.name}>
        <div
            className={`absolute inset-0 bg-black/60 ${step.waitForInteraction ? "pointer-events-none" : "pointer-events-auto"}`}>
            {hasSpotlight && (
                <div
                    className="pointer-events-none absolute rounded-xl border-2 border-primary-300 shadow-[0_0_200vmax_rgba(0,0,0,0.55)] transition-all duration-300"
                    style={{
                        top: spotlightRect.top,
                        left: spotlightRect.left,
                        width: spotlightRect.width,
                        height: spotlightRect.height,
                    }}
                />
            )}
            <div
                className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto w-full max-w-md p-4 sm:bottom-auto sm:left-1/2 sm:right-1/2 sm:-translate-x-1/2 sm:p-0">
                <section className="rounded-xl bg-white p-4 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Step {stepIndex + 1} of {flow.steps.length}
                        </p>
                        <button type="button" onClick={() => void skip()}>
                            <span className="text-xs text-slate-500 hover:underline">Skip Tour</span>
                        </button>
                    </div>
                </section>
            </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{step.content}</p>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-primary-600 transition-all"
                 style={{width: `${((stepIndex + 1) / flow.steps.length) * 100}%`}}/>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
            {step.secondaryAction?.action === "back" && (
                <button type="button"
                        className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                        onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}>
Back
</button>
})
<button
    type="button"
    onClick={() => void next()}
    disabled={nextDisabled}
    className="rounded:bg-primary-600.px-3.py-2.text-sm.font-semibold.text-white.hover:bg-primary-700.disabled:cursor-not-allowed.disabled:bg-slate-400"
>
    {nextLabel}
</button>
</div>
{nextDisabled && <p className="mt-2.text-right.text-xs.text-slate-600">Interact with the highlighted area to continue.</p>}
</section>
</div>,
document.body,
);