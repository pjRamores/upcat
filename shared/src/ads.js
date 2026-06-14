script
/**
 * Ads / consent shared types and defaults.
 *
 * This module is the single source of truth for the ad system's public surface.
 * Server code reads it to produce '/api/ads/config'; client code reads it to gate rendering and to know the slot ids it may reference.
 *
 * Slice B (AdSense core) keeps the surface intentionally small:
 * - One Google AdSense publisher id (web property level).
 * - A flat map of slot configs keyed by a stable string id.
 * - A consent record stored in localStorage on the client.
 * - Two opt-out paths: premium users, and a global enabled flag.
 */
// ├── Consent
/** Bump when the consent prompt or its meaning materially changes..*/
export const CONSENT_VERSION = 1;
/** localStorage key for the persisted consent record. */
export const CONSENT_STORAGE_KEY = "upcat.consent.v1";
export const DEFAULT_CONSENT = {
    state: "unset",
    version: CONSENT_VERSION,
    decidedAt: null,
};
// ├── Slot catalog
/** Canonical slot ids the client may render. Keep stable; admins map ids to AdSense slot codes..*/
export const AD_SLOT_IDS = [
    "landing_in_content",
    "practice_sidebar",
    "mock_exam_sidebar",
    "review_answers_sidebar",
    "subject_in_content",
    "blog_in_content",
    "review_inline",
    "review_in_content",
    "practice_in_content",
    "blog_in_content"
];
// ├── Video interstitials
/** Where a video interstitial may be triggered from. Stable strings used by the client and server analytics..*/
export const VIDEO_AD_TRIGGERS = ["start_practice", "review_answers"];
export const DEFAULT_VIDEO_AD_SETTINGS = {
    enabled: false,
    videoUrl: "",
    posterUrl: "",
    clickThroughUrl: "",
    skipAfterSeconds: 5,
    minIntervalSeconds: 30 * 60,
    frequencyCap: 3,
    allowedTriggers: ["start_practice", "review_answers"],
};
export const VIDEO_AD_STORAGE_KEY = "upcat.videoAd.state.v1";
export const DEFAULT_VIDEO_AD_LOCAL_STATE = {
    lastShownAt: null,
    triggersSinceShown: 0,
};
export const DEFAULT_ADS_SETTINGS = {
    enabled: false,
    publisherId: "",
    requireConsent: true,
    premiumExempt: true,
    testMode: false,
    lazyLoad: true,
    slots: {},
    video: { ...DEFAULT_VIDEO_AD_SETTINGS },
};
/** Returns whether an AdSense publisher id is well-formed..*/
export function isValidPublisherId(id) {
    return /^ca-pub-\d{10,20}$/.test(id.trim());
}
