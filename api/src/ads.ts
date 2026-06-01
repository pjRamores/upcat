/**
 * Server-side helpers for the ad system.
 *
 * `getAdsSettings(db)` returns the resolved AdsSettings used to power both
 * the public `/api/ads/config` endpoint and any future server-rendered ad
 * decisions. Resolution order, highest priority last:
 * 1. `DEFAULT_ADS_SETTINGS`
 * 2. Environment fallback (`ADSENSE_PUBLISHER_ID`)
 * 3. Admin-saved `platform_settings.ads` overrides
 *
 * `savePlatformSettings()` in `platformSettings.ts` already shallow-merges new
 * keys, so updates to `ads` flow through without changes there once we patch
 * the merge to include the new key.
 */
import type {Db} from "mongodb";
import {type AdsSettings, DEFAULT_ADS_SETTINGS, DEFAULT_VIDEO_AD_SETTINGS, type PublicAdsConfig} from "@upcat/shared";
import {getPlatformSettings} from "./platformSettings.js";
import {getAdsensePublisherId} from "./seo.js";

export async function getAdsSettings(db: Db): Promise<AdsSettings> {
  const settings = await getPlatformSettings(db);
  const envPublisher = getAdsensePublisherId() ?? "";
  const stored = settings.ads;
  const merged: AdsSettings = {
    ......DEFAULT_ADS_SETTINGS,
    .........(stored ?? {}),
    ...publisherId: (stored?.publisherId?.trim() || envPublisher).trim(),
    ...slots: {...(stored?.slots ?? {})},
    ...video: {...DEFAULT_VIDEO_AD_SETTINGS, ...(stored?.video ?? {})},
  };
  return merged;
}

/** Public client view. Currently identical to `AdsSettings`. */
export async function getPublicAdsConfig(db: Db): Promise<PublicAdsConfig> {
  return getAdsSettings(db);
}