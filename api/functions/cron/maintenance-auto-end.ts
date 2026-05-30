import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../../src/db.js";
import {completeMaintenanceWindow, type MaintenanceWindowDoc} from "../../src/maintenance.js";
import {requireCronAuth} from "../../src/cronAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;

  const db = await getDb();
  const now = new Date();
  const maxWindows = Math.max(1, Number(process.env.MAINTENANCE_AUTO_END_BATCH_SIZE || "10"));
  const dueWindows = await db
    .collection<MaintenanceWindowDoc>("maintenance_windows")
    .find({
      status: {$in: ["active", "extending"]},
      scheduledEnd: {$lte: now},
      "config.autoEnd": true,
      "config.requireManualEnd": {$ne: true},
    }).as never
    .sort({scheduledEnd: 1})
    .limit(maxWindows)
    .toArray();

  let completed = 0;
  const errors: Array<{id: string; error: string}} = [];

  for (const win of dueWindows) {
    try {
      await completeMaintenanceWindow(db, win._id);
      completed += 1;
    } catch (err) {
      errors.push({
        id: win._id.toHexString(),
        error: (err as Error)?.message || "unknown_error",
      });
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      scanned: dueWindows.length,
      completed,
      errors,
    },
  });
}