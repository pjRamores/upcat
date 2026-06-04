import { useAdsConfig } from "@/hooks/useAdsConfig";
import { useAuthStore } from "@/stores/authStore";
import { useConsentStore } from "@/stores/consentStore";

/**
 * Single decision point for "should we render ads right now?".
 *
 * Returns false if any of these hold:
 * - Ads config has not loaded yet
 * - Master 'enabled' flag is off
 * - No publisher id configured (except in `testMode`)
 * - The current user is premium AND 'premiumExempt' is true
 * - 'requireConsent' is true AND consent state is not "granted"
 */
export function useShouldShowAds(): boolean {
  const { config, loaded } = useAdsConfig();
  const user = useAuthStore((s) => s.user);
  const consent = useConsentStore((s) => s.record);
  const hydrated = useConsentStore((s) => s.hydrated);

  if (!loaded) return false;
  if (!config.enabled) return false;
  if (!config.testMode && !config.publisherId) return false;
  if (config.premiumExempt && user?.premium) return false;
  if (config.requireConsent) {
    if (!hydrated) return false;
    if (consent.state !== "granted") return false;
  }
  return true;
}