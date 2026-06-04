import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAdsConfig } from "@/hooks/useAdsConfig";
import { useConsentStore } from "@/stores/consentStore";

/**
 * Sticky bottom consent banner. Shown only when:
 * - Ads are enabled in config
 * - A publisher id is configured
 * - requireConsent is true
 * - The user has not yet decided (state === "unset")
 *
 * On first mount, hydrates the consent store from localStorage so SSR or cold renders do not flicker the banner for users who have already chosen.
 */
export default function ConsentBanner() {
  const { config, loaded } = useAdsConfig();
  const hydrated = useConsentStore((s) => s.hydrated);
  const record = useConsentStore((s) => s.record);
  const hydrate = useConsentStore((s) => s.hydrate);
  const setConsent = useConsentStore((s) => s.setConsent);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  if (!loaded || !hydrated) return null;
  if (!config.enabled || !config.publisherId) return null;
  if (!config.requireConsent) return null;
  if (record.state !== "unset") return null;

  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie and ads consent" data-testid="consent-banner" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-2xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          We use cookies to serve relevant ads and improve the UPCAT Simulator experience. See our{" "}
          <Link to="/privacy" className="underline hover:text-primary-700">privacy policy</Link>{" "}
          for details.
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button type="button" data-testid="consent-decline" onClick={() => setConsent("denied")} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Decline
          </button>
          <button type="button" data-testid="consent-accept" onClick={() => setConsent("granted")} className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}