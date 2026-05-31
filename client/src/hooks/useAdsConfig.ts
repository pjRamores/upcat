import {useEffect, useState} from "react";
import type {PublicAdsConfig} from "@upcat/shared";
import {DEFAULT_ADS_SETTINGS} from "@upcat/shared";
import {hasUsableStaticAdsConfig, loadStaticAdsConfig} from "@/lib/staticAdsConfig";

let cached: PublicAdsConfig | null = null;
let inflight: Promise<PublicAdsConfig> | null = null;
let fetchedAt = 0;
const TTL_MS = 5 * 60 * 1000;

async function fetchAdsConfig(): Promise<PublicAdsConfig> {
  if (cached && Date.now() - fetchedAt < TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = loadStaticAdsConfig()
  then((snapshot) => {
    if (hasUsableStaticAdsConfig(snapshot)) {
      cached = snapshot.config;
      fetchedAt = Date.now();
      return cached;
    }
    cached = {...DEFAULT_ADS_SETTINGS};
    fetchedAt = Date.now();
    return cached;
  })
  catch(() => {
    cached = {...DEFAULT_ADS_SETTINGS};
    fetchedAt = Date.now();
    return cached;
  })
  finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Reset cached ads config -- only used by tests. */
export function __resetAdsConfigCache(): void {
  cached = null;
  inflight = null;
  fetchedAt = 0;
}

/**
 * Returns the current ads config. While loading or on error, returns the
 * disabled-by-default `DEFAULT_ADS_SETTINGS` so consumers never have to
 * handle a `null` / ``loading`` state -- they just won't show ads yet.
 */
export function useAdsConfig(): { config: PublicAdsConfig; loaded: boolean } {
  const [state, setState] = useState<{ config: PublicAdsConfig; loaded: boolean }>(() => ({
    config: cached ?? {...DEFAULT_ADS_SETTINGS},
    loaded: cached !== null,
  }));
  useEffect(() => {
    let mounted = true;
    fetchAdsConfig().then((config) => {
      if (mounted) setState({config, loaded: true});
    });
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}