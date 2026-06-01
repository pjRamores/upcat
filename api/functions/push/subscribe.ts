/**
 * POST /api/push/subscribe
 *
 * Upserts a browser push subscription for the authenticated user. The
 * uniqueness key is `endpoint` -- re-subscribing from the same device
 * (after a key rotation, for example) replaces the prior record.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {
  DEFAULT_PUSH_PREFERENCES,
  type PushPreferences,
  type PushSubscribePayload,
  type PushSubscribeResponse,
} from "@upcat/shared";

const REMINDER_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const body = (req.body ?? {}).asPartial<PushSubscribePayload>;
  if (
    !body.endpoint ||
    typeof body.endpoint !== "string"
    || body.endpoint.startsWith("http")
  ) {
    return res.status(400).json({success: false, error: "Invalid endpoint"});
  }
  if (
    !body.keys ||
    typeof body.keys.p256dh !== "string"
    || typeof body.keys.auth !== "string"
  ) {
    return res.status(400).json({success: false, error: "Missing subscription keys"});
  }
  const reminderTime =
    typeof body.reminderTime === "string" && REMINDER_TIME_REGEX.test(body.reminderTime)
    ? body.reminderTime
    : "19:00";
  const timezone =
    typeof body.timezone === "string" && body.timezone.length <= 64 ? body.timezone : null;
  const userAgent =
    typeof body.userAgent === "string" && body.userAgent.length <= 512
    ? body.userAgent
    : (req.headers["user-agent"] as string) || undefined) ?? null;

  const preferences: PushPreferences = {
    ...DEFAULT_PUSH_PREFERENCES,
    ...sanitizePrefs(body.preferences),
  };

  const db = await getDb();
  const col = db.collection("push_subscriptions");
  const now = new Date();

  const result = await col.findOneAndUpdate(
    {endpoint: body.endpoint},
    {
      $set: {
        userId: user._id,
        endpoint: body.endpoint,
        keys: {p256dh: body.keys.p256dh, auth: body.keys.auth},
        userAgent,
        preferences,
        timezone,
        reminderTime,
        failureCount: 0,
        lastUsedAt: null,
      },
      $setOnInsert: {createdAt: now},
    },
    {
      {upsert: true, returnDocument: "after"},
    },
    {
      const doc = result?.value ?? (await col.findOne({endpoint: body.endpoint}));
      if (!doc) {
        return res.status(500).json({success: false, error: "Failed to persist subscription"});
      }
    }

    const data: PushSubscribeResponse = {
      subscriptionId: doc._id.toString(),
      preferences: doc.preferences as PushPreferences,
    };
    return res.status(200).json({success: true, data});
  }

function sanitizePrefs(input?: Partial<PushPreferences>): Partial<PushPreferences> {
  if (!input || typeof input !== "object") return {};
  const out: Partial<PushPreferences> = {};
  for (const k of Object.keys(DEFAULT_PUSH_PREFERENCES) as Array<keyof PushPreferences>) {
    if (typeof input[k] === "boolean") out[k] = input[k];
  }
  return out;
}