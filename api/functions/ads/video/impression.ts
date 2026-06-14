import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../../src/db.js";
import { extractToken } from "../../../src/auth.js";
import { VIDEO_AD_TRIGGERS, type VideoAdTrigger } from "@upcat/shared";

type ImpressionEvent = "shown" | "skipped" | "completed" | "clicked";
const EVENTS: readonly ImpressionEvent[] = ["shown", "skipped", "completed", "clicked"];

interface ImpressionBody {
  trigger?: string;
  event?: string;
  watchedSeconds?: number;
}

function isImpressionEvent(value: unknown): value is ImpressionEvent {
  return (
    value === "shown" ||
    value === "skipped" ||
    value === "completed" ||
    value === "clicked"
  );
}

/**
 * POST /api/ads/video/impression
 *
 * Anonymous-friendly: an authenticated user id is recorded when available,
 * otherwise null. Writes to `ad_video_impressions` for downstream analytics.
 * The endpoint deliberately accepts unauthenticated requests so we can still
 * log impressions for logged-out visitors.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as ImpressionBody;
  const trigger = body.trigger;
  const event = body.event;

  if (!trigger || !VIDEO_AD_TRIGGERS.includes(trigger as VideoAdTrigger)) {
    res.status(400).json({ error: "Invalid trigger" });
    return;
  }

  if (!isImpressionEvent(event)) {
    res.status(400).json({ error: "Invalid event" });
    return;
  }

  const watchedSeconds = Math.max(
    0,
    Math.min(
      3600,
      typeof body.watchedSeconds === "number" && Number.isFinite(body.watchedSeconds)
        ? body.watchedSeconds
        : 0,
    ),
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
      trigger: trigger as VideoAdTrigger,
      event,
      watchedSeconds,
      createdAt: new Date(),
    });

    res.status(204).end();
    return;
  } catch (err) {
    console.error("[ads/video/impression] failed:", err);
    res.status(500).json({ error: "Failed to record impression" });
    return;
  }
}
