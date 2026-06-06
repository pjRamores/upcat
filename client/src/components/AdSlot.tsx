import {useEffect, useRef} from "react";
import type {AdSlotId} from "@upcat/shared";
import {useAdsConfig} from "@/hooks/useAdsConfig";
import {useShouldShowAds} from "@/hooks/useShouldShowAds";
import {loadAdSenseScript, pushAdSenseSlot} from "@/lib/adsense";

interface AdSlotProps {
    /** Canonical slot id from `AD_SLOT_IDS`. */
    slotId: AdSlotId;
    /** Optional className for the outer wrapper. */
    className?: string;
    /** Optional inline style for the <ins> element. Defaults to `{ display: "block" }`. */
    style?: React.CSSProperties;
    /** Override format declared in admin settings. */
    format?: string;
    /** Override responsive flag declared in admin settings. */
    responsive?: boolean;
    /** Aria/label text shown only to screen readers + in placeholder mode. */
    label?: string;
}

/**
 * Reserves space and renders a Google AdSense ad unit.
 *
 * Renders nothing when ads shouldn't be shown (see `useShouldShowAds`) so
 * callers don't need to wrap it in their own conditional. In `testMode` it
 * renders a labelled placeholder box instead of pushing to AdSense, which
 * makes preview deploys + Playwright runs safe.
 */
export default function AdSlot({
                                   slotId,
                                   className,
                                   style,
                                   format,
                                   responsive,
                                   label,
                               }: AdSlotProps) {
    const { config, loaded } = useAdsConfig();
    const shouldShow = useShouldShowAds();
    const pushed = useRef(false);

    const slot = config.slots[slotId];
    const slotEnabled = slot?.enabled ?? Boolean(slot?.slot);
    const hasSlotCode = Boolean(slot?.slot);
    const canRenderRealAd = loaded && shouldShow && !config.testMode && slotEnabled && hasSlotCode;
    const showPlaceholder = loaded && shouldShow && slotEnabled && !canRenderRealAd;

    useEffect(() => {
        if (!canRenderRealAd || !hasSlotCode) return;
        if (pushed.current) return;
        const loaded = loadAdSenseScript(config.publisherId);
        if (!loaded) return;
        pushAdSenseSlot();
        pushed.current = true;
    }, [canRenderRealAd, hasSlotCode, config.publisherId]);

    if (!canRenderRealAd && !showPlaceholder) return null;

    const wrapperStyle: React.CSSProperties = {display: "block", ...style};
    const resolvedFormat = format ?? slot!.format ?? "auto";
    const resolvedResponsive = responsive ?? slot!.responsive ?? true;

    if (showPlaceholder) {
        const placeholderTitle = config.testMode
            ? `Ad slot: ${slotId}`
            : `Ad placeholder: ${slotId}`;
        const placeholderHint = config.testMode
            ? "Test mode placeholder"
            : hasSlotCode
                ? "Ad unavailable for current viewer settings"
                : "No slot code configured";

        return (
            <div
                className={className}
                data-ad-slot-id={slotId}
                data-ad-test={config.testMode ? "true" : "fallback"}
                role="complementary"
                aria-label={label ?? "Advertisement placeholder"}
                style={{
                    border: "1px dashed #94a3b8",
                    background: "#f1f5f9",
                    color: "#475569",
                    padding: "1.25rem",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    ...style,
                }}
            >
                <div style={{fontWeight: 600}}>{placeholderTitle}</div>
                <div style={{marginTop: "0.25rem", fontSize: "0.75rem", opacity: 0.9}}>
                    {placeholderHint}
                </div>
            </div>
        );
    }

    return (
        <div className={className} data-ad-slot-id={slotId} aria-label={label ?? "Advertisement"}>
            <ins
                className="adsbygoogle"
                style={wrapperStyle}
                data-ad-client={config.publisherId}
                data-ad-slot={slot!.slot}
                data-ad-format={resolvedFormat}
                data-full-width-responsive={resolvedResponsive ? "true" : "false"}
                {...(slot!.layout ? {"data-ad-layout": slot!.layout} : {})}
            />
        </div>
    )
};
