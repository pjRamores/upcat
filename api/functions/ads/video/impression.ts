import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../../src/db.js";
import {extractToken} from "../../src/auth.js";
import {VIDEO_AD_TRIGGERS, type VideoAdTrigger} from "@upcat/shared";

type ImpressionEvent = "shown" | "skipped" | "completed" | "clicked";
const EVENTS: ImpressionEvent[] = ["shown", "skipped", "completed", "clicked"];

interface ImpressionBody {
  trigger?: string;
  event?: string;
  watchedSeconds?: number;
}

/**
 * POST /api/ads/video/impression
 *
 * Anonymous-friendly: an authenticated user id is recorded when available,
 * otherwise null. Writes to `ad_video_impressions` for downstream analytics.
 * The endpoint deliberately accepts unauthenticated requests so we can still
 * log impressions for logged-out visitors.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({error: "Method not allowed"});
  }
  const body = (req.body ?? {}).as ImpressionBody;
  const trigger = body.trigger as VideoAdTrigger | undefined;
  const event = body.event as ImpressionEvent | undefined;
  if (!trigger || !VIDEO_AD_TRIGGERS.includes(trigger)) {
    return res.status(400).json({error: "Invalid trigger"});
  }
  if (!event || !EVENTS.includes(event)) {
    return res.status(400).json({error: "Invalid event"});
  }
  const watchedSeconds = Math.max(
    0,
    Math.min(3600, Number.isFinite(body.watchedSeconds) ? Number(body.watchedSeconds) : 0),
  );

  let userId: string | null = null;
  try {
    const payload = extractToken(req);
    userId = payload?.userId ?? null;
  } catch {
    userId = null;
  }

  try {
    const db = await getDb();
    await db.collection("ad_video_impressions").insertOne({
      userId,
      trigger,
      event,
      watchedSeconds,
      createdAt: new Date(),
    });
    return res.status(204).end();
  } catch (err) {
    console.error("[ads/video/impression] failed:", err);
    return res.status(500).json({error: "Failed to record impression"});
  }
}