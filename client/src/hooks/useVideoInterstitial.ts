import { useMemo } from "react";
import { VideoAdSettings, VideoAdTrigger } from "@upcat/shared";
import { useAdsConfig } from "@/hooks/useAdsConfig";
import { useShouldShowAds } from "@/hooks/useShouldShowAds";
import { isOutsideMinInterval, readVideoAdState, writeVideoAdState } from "@/lib/videoAdState";

interface VideoAdDecision {
    /**
     * Returns true if a video interstitial should be shown for the given trigger.
     * Bumps the trigger counter on every call; consumers must call this exactly once per qualifying trigger event.
     */
    shouldShow: (trigger: VideoAdTrigger) => boolean;
    /**
     * Marks an interstitial as shown - resets the counter and stamps the time.
     */
    markShown: () => void;
}

export interface ResolvedVideoTriggerSettings {
    skipAfterSeconds: number;
    minIntervalSeconds: number;
    frequencyCap: number;
}

export function resolveVideoTriggerSettings(
    video: VideoAdSettings,
    trigger: VideoAdTrigger,
): ResolvedVideoTriggerSettings {
    const override = video.triggerSettings?.[trigger];
    return {
        skipAfterSeconds: Math.max(0, Math.floor(override?.skipAfterSeconds ?? video.skipAfterSeconds)),
        minIntervalSeconds: Math.max(0, Math.floor(override?.minIntervalSeconds ?? video.minIntervalSeconds)),
        frequencyCap: Math.max(1, Math.floor(override?.frequencyCap ?? video.frequencyCap)),
    };
}

/**
 * Decision hook for video interstitials.
 * Combines: base ad gating (consent + premium), per-trigger allow-list, frequency cap (1 per N session-finishes), and minimum interval (in seconds) between two consecutive interstitials.
 * The hook is pure with respect to its return value - `shouldShow` itself mutates localStorage (incrementing the counter), which is the only way to faithfully implement "every Nth event" without a separate primer call.
 */
export function useVideoInterstitial(): VideoAdDecision {
    const { config } = useAdsConfig();
    const adsAllowed = useShouldShowAds();

    const decision = useMemo<VideoAdDecision>(() => {
        const shouldShow = (trigger: VideoAdTrigger): boolean => {
            const v = config.video;
            const baseAllowed = config.testMode ? config.enabled : adsAllowed;
            if (!baseAllowed) return false;
            if (!v?.enabled) return false;
            if (!config.testMode && !v.videoUrl) return false;
            if (!v.allowedTriggers.includes(trigger)) return false;

            const triggerSettings = resolveVideoTriggerSettings(v, trigger);

            const state = readVideoAdState();
            if (isOutsideMinInterval(state, triggerSettings.minIntervalSeconds)) return false;

            const nextCount = state.triggersSinceShown + 1;
            writeVideoAdState({ ...state, triggersSinceShown: nextCount });

            return nextCount >= triggerSettings.frequencyCap;
        };

        const markShown = (): void => {
            writeVideoAdState({
                lastShownAt: new Date().toISOString(),
                triggersSinceShown: 0,
            });
        };

        return { shouldShow, markShown };
    }, [adsAllowed, config.testMode, config.video]);

    return decision;
}

/**
 * Imperative reset, used only from tests.
 */
export function _resetVideoAdState(): void {
    writeVideoAdState({ lastShownAt: null, triggersSinceShown: 0 });
}

export { useVideoInterstitial as default };

/**
 * Posts a non-blocking impression event. Failures are swallowed because analytics losses must never disrupt the user-facing flow.
 */
export function reportVideoImpression(
    trigger: VideoAdTrigger,
    event: "shown" | "skipped" | "completed" | "clicked",
    watchedSeconds = 0,
): void {
    if (typeof fetch === "undefined") return;
    const url = "/api/ads/video/impression";
    const body = JSON.stringify({ trigger, event, watchedSeconds });
    try {
        // Prefer sendBeacon when available (survives page navigations).

if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
}
void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
}).catch(() => undefined);
} catch {
    // ignore
}