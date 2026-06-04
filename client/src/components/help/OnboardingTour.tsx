);
}, []);

useEffect(() => {
    if (!isOwnerInstance) {
        setStorageChecked(true);
        return;
    }

    if (!isAuthenticated || !isAdminPreview) {
        setStorageChecked(true);
        return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        setStorageChecked(true);
        return;
    }

    try {
        const parsed = JSON.parse(raw) as PersistedTourState;
        if (parsed?.flowId) {
            helpApi
                .onboardingFlow(parsed.flowId, { page: location.pathname, manual: true })
                .then((result) => {
                    setFlow(normalizeOnboardingFlow(result.flow));
                    setStepIndex(Math.max(0, parsed.stepIndex));
                    setCompletedSteps(parsed.completedSteps ?? []);
                    setStorageChecked(true);
                })
                .catch(() => {
                    localStorage.removeItem(STORAGE_KEY);
                    setStorageChecked(true);
                });
        } else {
            setStorageChecked(true);
        }
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        setStorageChecked(true);
    }
}, [isAuthenticated, isAdminPreview, isOwnerInstance, location.pathname]);

useEffect(() => {
    if (!isOwnerInstance || !storageChecked) return;
    if (!isAuthenticated || (isAdmin && !isAdminPreview) || flow || hidden) return;

    let cancelled = false;
    helpApi
        .checkOnboarding(location.pathname)
        .then(async (result) => {
            if (cancelled || !result.items.length) return;
            const candidate = result.items[0];
            if (!candidate) return;
            const data = await helpApi.onboardingFlow(candidate.flowId, { page: location.pathname });
            if (cancelled) {
                setFlow(normalizeOnboardingFlow(data.flow));
                setStepIndex(0);
                setCompletedSteps([]);
            }
        })
        .catch(() => undefined);

    return () => {
        cancelled = true;
    };
}, [flow, hidden, isAuthenticated, isAdmin, isAdminPreview, isOwnerInstance, location.pathname, storageChecked]);

useEffect(() => {
    if (!flow) return;
    const payload: PersistedTourState = {
        flowId: flow._id,
        stepIndex,
        completedSteps,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}, [flow, stepIndex, completedSteps]);

useEffect(() => {
    if (!flow) return;
    const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            void skip();
        } else if (event.key === "Enter") {
            void next();
        } else if (event.key === "ArrowRight") {
            void next();
        } else if (event.key === "ArrowLeft") {
            setStepIndex((prev) => Math.max(0, prev - 1));
        }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    target.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
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
  }

  const updatedCompletedSteps = completedSteps.includes(step.id) ? completedSteps : [...completedSteps, step.id];
  setCompletedSteps(updatedCompletedSteps);

  const shouldSuppressNavigateAfterNewUserTour = flow.id === "new_user_tour" && step.primaryAction.action === "navigate";
  if (step.primaryAction.action === "navigate" && step.primaryAction.navigateTo) {
    if (shouldSuppressNavigateAfterNewUserTour) {
await complete(true, updatedCompletedSteps.length);
} else {
    await complete(true, updatedCompletedSteps.length, step.primaryAction.navigateTo);
}
return;

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
    setHidden(true);
    setTimeout(() => setHidden(false), 1500);
}

if (!isOwnerInstance || !flow || !step) return null;

const hasSpotlight = step.target.type === "element" && spotlightRect;
const requiresInteraction = step.waitForInteraction && !step.target.selector;
const nextDisabled = requiresInteraction && !stepInteracted;
const nextLabel = flow._id === "new_user_tour" && step.primaryAction.action === "navigate" ? "Finish Tour" : (step.primaryAction.label || "Next");

return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={flow.name}>
        <div className={`absolute inset-0 bg-black/60 ${step.waitForInteraction ? "pointer-events-none" : "pointer-events-auto"}`}>...</div>
        {hasSpotlight && (
            <div className="pointer-events-none absolute rounded-xl border-2 border-primary-300 shadow-[0_0_0_200vmax_rgba(0,0,0,0.55)] transition-all duration-300" style={{ top: spotlightRect.top, left: spotlightRect.left, width: spotlightRect.width, height: spotlightRect.height }}>
                ...
            </div>
        )}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto w-full max-w-md p-4 sm:bottom-auto sm:left-1/2 sm:top-16 sm:-translate-x-1/2 sm:p-0">
            <section className="rounded-xl bg-white p-4 shadow-2xl">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Step {stepIndex + 1} of {flow.steps.length}
                    </p>
                    <button type="button" onClick={() => void skip()}>
                        <span className="text-xs text-slate-500 hover:underline">Skip Tour</span>
                    </button>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{step.content}</p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-primary-600 transition-all" style={{ width: `${((stepIndex + 1) / flow.steps.length) * 100}%` }}>
                        ...
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    {step.secondaryAction?.action === "back" && (
                        <button type="button" className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}>
                            ...
                        </button>
                    )}
                </div>
            </section>
        </div>
    </div>
);
})
    <button
        type="button"
        onClick={() => void next()}
        disabled={nextDisabled}
        className="rounded bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
        {nextLabel}
    </button>
</div>
{nextDisabled &&
    <p className="mt-2 text-right text-xs text-slate-600">Interact with the highlighted area to continue.</p>}
</section>
</div>,
document.body,
);