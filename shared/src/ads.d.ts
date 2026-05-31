/**
 * Ads / consent shared types and defaults.
 *
 * This module is the single source of truth for the ad system's public surface.
 * Server code reads it to produce `/api/ads/config`; client code reads it to
 * gate rendering and to know the slot ids it may reference.
 *
 * Slice B (AdSense core) keeps the surface intentionally small:
 * - One Google AdSense publisher id (web property level).
 * - A flat map of slot configs keyed by a stable string id.
 * - A consent record stored in localStorage on the client.
 * - Two opt-out paths: premium users, and a global enabled flag.
 */
/** Bump when the consent prompt or its meaning materially changes. */
export declare const CONSENT_VERSION = 1;
/** localStorage key for the persisted consent record. */
export declare const CONSENT_STORAGE_KEY = "upcat.consent.v1";
export type ConsentState = "granted" | "denied" | "unset";
export interface ConsentRecord {
  state: ConsentState;
  /** Schema version of the prompt the user responded to. */
  version: number;
  /** ISO timestamp of the user's choice. */
  decidedAt: string | null;
}
export declare const DEFAULT_CONSENT: ConsentRecord;
/** Canonical slot ids the client may render. Keep stable; admins map ids → AdSense slot codes. */
export declare const AD_SLOT_IDS: readonly["landing_in_content", "practice_sidebar", "mock_exam_sidebar", "review_answers_sidebar", "subject_in_content", "blog_in_content"];
export type AdSlotId = (typeof AD_SLOT_IDS)[number];
export type AdSlotFormat = "auto" | "rectangle" | "horizontal" | "vertical" | "fluid";
export interface AdSlotConfig {
  /** AdSense slot id (the numeric "data-ad-slot" value). */
  slot: string;
  format?: AdSlotFormat;
  /** Optional layout key for in-feed/in-article ads. */
  layout?: string;
  /** When true, sets data-full-width-responsive="true". */
  responsive?: boolean;
  /** When true, this slot may render. */
  enabled?: boolean;
}
export interface AdsSettings {
  /** Master kill-switch for the entire ad system. */
  enabled: boolean;
  /** AdSense publisher id, e.g. "ca-pub-1234567890123456". Falls back to env on the server. */
  publisherId: string;
  /** When true, ads are gated behind explicit user consent. */
  requireConsent: boolean;
  /** When true, premium users see no ads. */
  premiumExempt: boolean;
  /** When true, render visible placeholder boxes instead of real ads (dev/preview). */
  testMode: boolean;
  /** Defer script load until first AdSlot mounts. */
  lazyLoad: boolean;
  /** Slot configuration keyed by canonical slot id. */
  slots: Partial<Record<AdSlotId, AdSlotConfig>>;
  /** Video interstitial configuration. */
  video: VideoAdSettings;
}
/** Where a video interstitial may be triggered from. Stable strings used by the client and server analytics. */
export declare const VIDEO_AD_TRIGGERS: readonly["start_practice", "review_answers"];
export type VideoAdTrigger = (typeof VIDEO_AD_TRIGGERS)[number];
export interface VideoAdSettings {
  /** Master switch for video interstitials. */
  enabled: boolean;
  /** Direct URL to an MP4/WebM clip. Empty string disables video. */
  videoUrl: string;
  /** Optional poster image shown before playback. */
  posterUrl?: string;
  /** Optional click-through URL for the "Learn more" button. */
  clickThroughUrl?: string;
  /** Seconds the user must watch before a Skip button appears. */
  skipAfterSeconds: number;
  /** Minimum gap, in seconds, between two interstitials shown to one viewer. */
  minIntervalSeconds: number;
  /** Show at most one interstitial per N trigger events. 1 = every time. */
  frequencyCap: number;
  /** Triggers this campaign is allowed to fire on. */
  allowedTriggers: VideoAdTrigger[];
}
export declare const DEFAULT_VIDEO_AD_SETTINGS: VideoAdSettings;
export declare const VIDEO_AD_STORAGE_KEY = "upcat.videoAd.state.v1";
export interface VideoAdLocalState {
  /** ISO timestamp of last shown interstitial. */
  lastShownAt: string | null;
  /** Count of trigger events since the last shown interstitial. Reset to 0 on show. */
  triggersSinceShown: number;
}
export declare const DEFAULT_VIDEO_AD_LOCAL_STATE: VideoAdLocalState;
export declare const DEFAULT_ADS_SETTINGS: AdsSettings;
/**
 * Public, client-safe view of the ad config served by GET /api/ads/config.
 * Identical to `AdsSettings` today; kept as a separate type so we can strip
 * server-only fields later without a breaking client change.
 */
export type PublicAdsConfig = AdsSettings;
/** Returns whether an AdSense publisher id is well-formed. */
export declare function isValidPublisherId(id: string): boolean;