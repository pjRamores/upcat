import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import {
  activateMaintenanceWindow,
  buildMaintenanceStatus,
  completeMaintenanceWindow,
  defaultMaintenanceConfig,
  type MaintenanceStatus,
  type MaintenanceWindowDoc,
} from "../../../../src/maintenance.js";

function getResource(req: VercelRequest): string {
  return typeof req.query.resource === "string" ? req.query.resource : "windows";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();
  const resource = getResource(req);

  if (resource === "windows") {
    if (req.method === "GET") {
      const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
      const filter = statusFilter ? { status: statusFilter as MaintenanceStatus } : {};
      const items = await db.collection<MaintenanceWindowDoc>("maintenance_windows").find(filter).sort({ scheduledStart: -1 }).limit(200).toArray();
      return res.status(200).json({ success: true, data: items });
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as Partial<MaintenanceWindowDoc> & { title?: string; description?: string };
      const now = new Date();
      const scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : new Date(now.getTime() + 60 * 60_000);
      const scheduledEnd = body.scheduledEnd ? new Date(body.scheduledEnd) : new Date(scheduledStart.getTime() + 60 * 60_000);
      const created: Omit<MaintenanceWindowDoc, "_id"> = {
        title: body.title || "Scheduled Maintenance",
        description: body.description || "Planned platform maintenance",
        internalNotes: body.internalNotes || null,
        scheduledStart,
        scheduledEnd,
        estimatedDuration: Math.max(1, Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / 60_000)),
        actualStart: null,
        actualEnd: null,
        status: "scheduled",
        config: body.config || defaultMaintenanceConfig(),
        notifications: {
          advanceNoticeSent: false,
          advanceNoticeSentAt: null,
          startNotificationSent: false,
          endNotificationSent: false,
          affectedUserCount: null,
        },
        createdBy: admin._id,
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection<MaintenanceWindowDoc>("maintenance_windows").insertOne(created as never);
      return res.status(201).json({ success: true, data: { ...created, _id: result.insertedId } });
    }

    if (req.method === "PUT") {
      const id = typeof req.query.id === "string" ? req.query.id : "";
      if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Valid id required" });
      const patch = (req.body ?? {}) as Partial<MaintenanceWindowDoc>;
      await db.collection<MaintenanceWindowDoc>("maintenance_windows").updateOne(
        { _id: new ObjectId(id) },
        {$set: { ...patch, updatedAt: new Date() } as never},
      );
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET,POST,PUT");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (resource === "activate" && req.method === "POST") {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Valid id required" });
    const result = await activateMaintenanceWindow(db, new ObjectId(id));
    return res.status(200).json({ success: true, data: result });
  }

  if (resource === "complete" && req.method === "POST") {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Valid id required" });
    await completeMaintenanceWindow(db, new ObjectId(id));
    return res.status(200).json({ success: true });
  }

  if (resource === "cancel" && req.method === "POST") {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, error: "Valid id required" });
    await db.collection<MaintenanceWindowDoc>("maintenance_windows").updateOne(
      { _id: new ObjectId(id) },
      {$set: { status: "cancelled", updatedAt: new Date() } as never},
    );
    return res.status(200).json({ success: true });
  }

  if (resource === "emergency" && req.method === "POST") {
    const body = (req.body ?? {}) as { enabled?: boolean; message?: string; estimatedReturnMinutes?: number };

const estimated = new Date(Date.now()) + Math.max(10, Number(body.estimatedReturnMinutes || 30)) * 60_000;
await db.collection("maintenance_state").updateOne(
    { id: "global" } as never,
    {
        $set: {
            id: "global",
            isActive: Boolean(body.enabled),
            activeWindowId: null,
            forceMaintenanceMode: Boolean(body.enabled),
            forceMaintenanceMessage: body.message || "Emergency maintenance in progress",
            estimatedReturn: body.enabled ? estimated : null,
            updatedAt: new Date(),
            updatedBy: admin._id,
        },
    },
    { upsert: true },
);
return res.status(200).json({ success: true });

if (resource === "status" && req.method === "GET") {
    const status = await buildMaintenanceStatus(db);
    return res.status(200).json({ success: true, data: status });
}

if (resource === "active-sessions" && req.method === "GET") {
    const sessions = await db.collection("exam_sessions")
        .find({ status: "in_progress" })
        .project({ userId: 1, startedAt: 1, updatedAt: 1, config: 1, offlineData: 1, devices: 1 })
        .sort({ updatedAt: -1 })
        .limit(300)
        .toArray();
    return res.status(200).json({ success: true, data: sessions });
}

return res.status(404).json({ success: false, error: "Unknown maintenance resource" });