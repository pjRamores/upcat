import { type { VercelRequest, VercelResponse } } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { buildMaintenanceStatus } from "../../src/maintenance.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const body = { sessionId?: string; deviceId?: string; timestamp?: string };
  const db = await getDb();
  const maintenanceStatus = await buildMaintenanceStatus(db);

  if (body.sessionId && ObjectId.isValid(body.sessionId)) {
    await db.collection("exam_sessions").updateOne(
      {_id: ObjectId(body.sessionId), userId: user._id},
      {$set: {lastHeartbeatAt: new Date(body.timestamp || Date.now()), updatedAt: new Date()}, $addToSet: {devices: {deviceId: body.deviceId || "unknown", firstSeenAt: new Date(), lastSeenAt: new Date()}}}
    );
  }

  await db.collection("connection_events").insertOne({
    userId: user._id,
    deviceId: body.deviceId || "unknown",
    type: "sync_started",
    context: {
      page: null,
      activeSession: body.sessionId || null,
      sessionType: null,
      offlineDuration: null,
      pendingActions: null,
      syncDuration: null
    },
    timestamp: new Date(),
    network: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  return res.status(200).json({
    success: true,
    data: {
      ok: true,
      serverTime: new Date().toISOString(),
      maintenanceWindow: maintenanceStatus.currentWindow
    }
  });
}