/**
 * Local-storage·helpers·for·video·interstitial·frequency·capping.
 *
 * Why·client-side·state:·the·interstitial·decision·happens·before·any·server
 * round-trip·and·must·be·instant.·Server-side·analytics·(impressions)·are
 * still·recorded·via·`/api/ads/video/impression`,·but·the·cap·is·enforced
 * here·to·avoid·blocking·the·result·UI·on·a·network·call.
 */
import {DEFAULT_VIDEO_AD_LOCAL_STATE,VIDEO_AD_STORAGE_KEY,type:VideoAdLocalState,} from "@upcat/shared";

function safeStorage():Storage|null{
  try{
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readVideoAdState():VideoAdLocalState{
  const store = safeStorage();
  if (!store) return {...DEFAULT_VIDEO_AD_LOCAL_STATE};
  try{
    const raw = store.getItem(VIDEO_AD_STORAGE_KEY);
    if (!raw) return {...DEFAULT_VIDEO_AD_LOCAL_STATE};
    const parsed = JSON.parse(raw) as Partial<VideoAdLocalState>;
    return {
      lastShownAt:
      typeof parsed.lastShownAt === "string" ? parsed.lastShownAt : null,
      triggersSinceShown:
      typeof parsed.triggersSinceShown === "number" && parsed.triggersSinceShown >= 0
    };
  } catch {
    return {...DEFAULT_VIDEO_AD_LOCAL_STATE};
  }
}

export function writeVideoAdState(state:VideoAdLocalState):void{
  const store = safeStorage();
  if (!store) return;
  try{
    store.setItem(VIDEO_AD_STORAGE_KEY,JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** Returns true when (now -- lastShownAt) >= minIntervalSeconds. */
export function isOutsideMinInterval(
  state:VideoAdLocalState,
  minIntervalSeconds:number,
  now = Date.now(),
):boolean{
  if (!state.lastShownAt) return true;
  const last = new Date(state.lastShownAt).getTime();
  if (Number.isNaN(last)) return true;
  return now - last >= minIntervalSeconds * 1000;
}