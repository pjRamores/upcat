/**
 * Phase 14 - Web-push helper.
 *
 * Centralizes VAPID configuration, payload signing, error handling,
 * and auto-pruning of dead subscriptions. All push-sending code paths
 * (subscribe-test, admin broadcast, cron jobs) go through 'sendPush'.
 */
import type {Db, ObjectId} from "mongodb";
import webpush, {type PushSubscription, type WebPushError} from "web-push";
import type {PushNotificationPayload, PushPreferences, PushSubscriptionRecord} from "@upcat/shared";

let vapidConfigured = false;

export interface VapidConfig {
    publicKey: string;
    privateKey: string;
    subject: string;
}

export function getVapidConfig(): VapidConfig | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@upcat.local";
    if (!publicKey || !privateKey) return null;
    return {publicKey, privateKey, subject};
}

function ensureConfigured(): VapidConfig | null {
    if (vapidConfigured) return getVapidConfig();
    const cfg = getVapidConfig();
    if (!cfg) return null;
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    vapidConfigured = true;
    return cfg;
}

export interface SendResult {
    endpoint: string;
    ok: boolean;
    statusCode?: number;
    /** True when we marked the subscription pruned (404/410). */
    pruned: boolean;
    error?: string;
}

/** Send a push to a single endpoint. Increments failureCount or prunes. */
export async function sendPushTo(
    db: Db,
    sub: {
        _id: ObjectId;
        endpoint: string;
        keys: {p256dh: string; auth: string};
    },
    payload: PushNotificationPayload
): Promise<SendResult> {
    if (!ensureConfigured()) {
        return {
            endpoint: sub.endpoint,
            ok: false,
            pruned: false,
            error: "VAPID not configured",
        };
    }
    const wpSub: PushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
    };
    try {
        const res = await webpush.sendNotification(wpSub, JSON.stringify(payload), {
            TTL: 60 * 60 * 24, // 24h
        });
        await db.collection("push_subscriptions").updateOne(
            {_id: sub._id},
            {$set: {lastUsedAt: new Date(), failureCount: 0}},
        );
        return {endpoint: sub.endpoint, ok: true, statusCode: res.statusCode, pruned: false};
    } catch (err) {
        const e = err as WebPushError;
        const statusCode = e?.statusCode ?? 0;
        if (statusCode === 404 || statusCode === 410) {
            // Gone - prune immediately.
            await db.collection("push_subscriptions")
                .deleteOne({_id: sub._id});
            return {endpoint: sub.endpoint, ok: false, statusCode, pruned: true};
        }
        await db.collection("push_subscriptions").updateOne(
            {_id: sub._id},
            {$inc: {failureCount: 1}},
        );
        return {
            endpoint: sub.endpoint,
            ok: false,
            statusCode,
            pruned: false,
            error: e?.body ?? (err instanceof Error ? err.message : String(err)),
        };
    }
}

/**
 * Resolve all push subscriptions that opt-in to a given notification type,
 * scoped to the supplied userId list (or all users when null).
 */
export async function listSubscriptionsForType(
  db: Db,
  type: keyof PushPreferences,
  userIds: ObjectId[] | null,
): Promise<
  Array<{
    _id: ObjectId;
    userId: ObjectId;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }>
> {
  const filter: Record<string, unknown> = {
    [preferences.${String(type)}]: true,
  };
  if (userIds !== null) filter.userId = {$in: userIds};
  const docs = (await db
    .collection("push_subscriptions")
    .find(filter)
    .project({userId:1, endpoint:1, keys:1})
    .toArray()) as unknown as Array<{
      _id: ObjectId;
      userId: ObjectId;
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }>;
  return docs;
}

export function publicSubscription(
  sub: Pick<
    PushSubscriptionRecord,
    | "endpoint"
    | "userAgent"
    | "preferences"
    | "reminderTime"
    | "timezone"
    | "createdAt"
    | "lastUsedAt"
  > & { _id: ObjectId },
) {
  return {
    subscriptionId: sub._id.toString(),
    endpoint: sub.endpoint,
    userAgent: sub.userAgent,
    preferences: sub.preferences,
    reminderTime: sub.reminderTime,
    timezone: sub.timezone,
    createdAt: sub.createdAt,
    lastUsedAt: sub.lastUsedAt,
  };
}