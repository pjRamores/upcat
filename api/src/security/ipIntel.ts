/**
 * Phase 15 — IP intelligence + threat scoring.
 *
 * Single upserted document per IP in `ip_intelligence`. Every middleware
 * touch is fire-and-forget (`void` recordRequest(...)). Threat-score
 * adjustments are applied via `adjustThreatScore()` and clamped to
 * [THREAT_SCORE_MIN, THREAT_SCORE_MAX]. Reputation classification is
 * recomputed on every score change.
 */
import {ObjectId} from "mongodb";
import {classifyThreatScore, THREAT_SCORE_ADJUSTMENTS, THREAT_SCORE_MAX, THREAT_SCORE_MIN} from "@upcat/shared";
import {getDb} from "../db.js";

export interface RecordRequestInput {
  ip: string;
  userAgent?: string | null;
  userId?: string | null;
  fingerprint?: string | null;
}

/** Upserts the IP record and bumps activity counters. */
export async function recordRequest(input: RecordRequestInput): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date();
    const update = Record<string, unknown> = {
      $set: {"activity.lastSeenAt": now, updatedAt: now},
      $setOnInsert: {
        _id: input.ip,
        reputation: "neutral",
        threatScore: 0,
        isKnownProxy: false,
        isKnownVPN: false,
        isKnownTor: false,
        isKnownDataCenter: false,
        country: null,
        asn: null,
        asnOrg: null,
        "activity.firstSeenAt": now,
        "activity.failedLoginsTotal": 0,
        "activity.failedLoginsToday": 0,
        "activity.accountsCreated": 0,
        "activity.accountsCreatedToday": 0,
        "activity.examSessionsStarted": 0,
        "activity.flaggedActions": 0,
        fingerprints: [],
        userAgents: [],
        associatedUserIds: [],
        blocks: [],
        riskFactors: [],
      },
      $inc: {"activity.totalRequests": 1, "activity.requestsToday": 1},
    };
    const addToSet = Record<string, unknown> = {};
    if (input.userAgent) {
      addToSet.userAgents = {$each: [input.userAgent.slice(0, 300)], $slice: -10};
    }
    if (input.fingerprint) {
      addToSet.fingerprints = {$each: [input.fingerprint], $slice: -10};
    }
    if (input.userId) {
      addToSet.associatedUserIds = {$each: [new ObjectId(input.userId)], $slice: -20};
    }
    if (Object.keys(addToSet).length) update.$addToSet = addToSet;

    await db.collection("ip_intelligence").updateOne(
      {_id: input.ip as never},
      update,
      {upsert: true},
    );
  } catch {
    /* fire-and-forget */
  }
}

/**
 * Atomically nudges the threat score by `delta` (positive = worse) and
 * reclassifies reputation. Returns the post-adjustment values for tests.
 */
export async function adjustThreatScore(
  ip: string,
  signal: keyof typeof THREAT_SCORE_ADJUSTMENTS | {delta: number; reason: string},
) : Promise<{score: number; reputation: string}| null> {
  try {
    const db = await getDb();
    const delta = {
      typeof signal === "string" ? THREAT_SCORE_ADJUSTMENTS[signal] ?? 0 : signal.delta;
      const reason = typeof signal === "string" ? signal : signal.reason;
    } if (delta === 0) return null;

    // Make sure the row exists with safe defaults.
    await recordRequest({ip});

    // Fetch then update — needed for min/max clamping + reputation derivation.
    const doc = (await db
      .collection("ip_intelligence")
      .findOne({_id: ip as never}, {projection: {threatScore: 1, riskFactors: 1}})) as
      {threatScore: number; riskFactors: string[]}
    | null;
    const oldScore = doc?.threatScore ?? 0;
    const newScore = Math.min(THREAT_SCORE_MAX, Math.max(THREAT_SCORE_MIN, oldScore + delta));
    const reputation = classifyThreatScore(newScore);

    const update = Record<string, unknown> = {
$set: {
  threatScore: newScore,
  reputation,
  updatedAt: newDate(),
},
if (reason && !(doc?.riskFactors??[]).includes(reason)) {
  update.$addToSet = {riskFactors: {$each: [reason], $slice: -20}};
}
await db.collection("ip_intelligence").updateOne({_id: ip as never}, update);
return {score: newScore, reputation};
} catch {
return null;
}
}

/** Bumps the per-IP "failed login" counters (sec event logging is separate). */
export async function recordFailedLogin(
  ip: string,
  opts: {unknownAccount: boolean},
) : Promise<void> {
  try {
    const db = await getDb();
    await db.collection("ip_intelligence").updateOne(
      {_id: ip as never},
    {
      $inc: {
        "activity.failedLoginsTotal": 1,
        "activity.failedLoginsToday": 1,
      },
      $set: {updatedAt: newDate()},
    },
    {upsert: true},
  );
  await adjustThreatScore(
    ip,
    opts.unknownAccount ? "failed_login_unknown_account" : "failed_login",
  );
} catch {
/* swallow */
}
}
export async function getIpIntel(ip: string) {
  const db = await getDb();
  return await db.collection("ip_intelligence").findOne({_id: ip as never});
}