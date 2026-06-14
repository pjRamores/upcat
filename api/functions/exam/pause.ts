import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSessionAccess } from "../../src/examHelpers.js";

type SessionTimerState = {
  pausedAt?: Date | string | null;
  totalPausedMs?: number | null;
};

type ExamSessionDoc = {
  status?: string;
  timerState?: SessionTimerState;
};

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function clampEventDate(raw: unknown): Date {
  const parsed = parseDate(raw);
  if (!parsed) return new Date();

  const now = Date.now();
  const ts = parsed.getTime();
  return new Date(Math.min(ts, now));
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  const action = req.query.action === "resume" ? "resume" : "pause";

  const ctx = await requireSessionAccess(req, res);
  if (!ctx) return;

  const { db, sessionOid, userOid } = ctx;

  const session = (await db.collection("exam_sessions").findOne(
    { _id: sessionOid, userId: userOid },
    { projection: { status: 1, timerState: 1 } },
  )) as ExamSessionDoc | null;

  if (!session) {
    res.status(404).json({
      success: false,
      error: "Session not found",
    });
    return;
  }

  if (session.status !== "in_progress") {
    res.status(400).json({
      success: false,
      error: "Only in-progress sessions can be paused or resumed",
    });
    return;
  }

  const now = new Date();
  const eventAt = clampEventDate((req.body as Record<string, unknown> | undefined)?.at);
  const currentTotalPausedMs = Math.max(
    0,
    Number(session.timerState?.totalPausedMs ?? 0),
  );
  const currentPausedAt = parseDate(session.timerState?.pausedAt);

  if (action === "pause") {
    if (currentPausedAt) {
      res.status(200).json({
        success: true,
        data: {
          paused: true,
          pausedAt: currentPausedAt.toISOString(),
          timerExtensionMs:
            currentTotalPausedMs +
            Math.max(0, Date.now() - currentPausedAt.getTime()),
        },
      });
      return;
    }

    await db.collection("exam_sessions").updateOne(
      { _id: sessionOid, userId: userOid },
      {
        $set: {
          "timerState.pausedAt": eventAt,
          "timerState.totalPausedMs": currentTotalPausedMs,
          updatedAt: now,
        },
      },
    );

    res.status(200).json({
      success: true,
      data: {
        paused: true,
        pausedAt: eventAt.toISOString(),
        timerExtensionMs: currentTotalPausedMs,
      },
    });
    return;
  }

  // resume
  if (!currentPausedAt) {
    res.status(200).json({
      success: true,
      data: {
        paused: false,
        pausedAt: null,
        timerExtensionMs: currentTotalPausedMs,
      },
    });
    return;
  }

  const additionalPausedMs = Math.max(0, eventAt.getTime() - currentPausedAt.getTime());
  const nextTotalPausedMs = currentTotalPausedMs + additionalPausedMs;

  await db.collection("exam_sessions").updateOne(
    { _id: sessionOid, userId: userOid },
    {
      $set: {
        "timerState.pausedAt": null,
        "timerState.totalPausedMs": nextTotalPausedMs,
        updatedAt: now,
      },
    },
  );

  res.status(200).json({
    success: true,
    data: {
      paused: false,
      pausedAt: null,
      timerExtensionMs: nextTotalPausedMs,
    },
  });
}
