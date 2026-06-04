import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {activateMaintenanceWindow, type MaintenanceWindowDoc} from "../../src/maintenance.js";
import {requireCronAuth} from "../../src/cronAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;

    const db = await getDb();
    const now = new Date();
    const maxWindows = Math.max(1, Number(process.env.MAINTENANCE_AUTO_START_BATCH_SIZE || "10"));
    const dueWindows = await db
        .collection<MaintenanceWindowDoc>("maintenance_windows")
        .find({
            status: {$in: ["scheduled", "warning"]},
            scheduledStart: {$lte: now},
            "config.autoStart": true,
        } as never)
        .sort({scheduledStart: 1})
        .limit(maxWindows)
        .toArray();

    let started = 0;
    let activeSessions = 0;
    let sessionsExtended = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const win of dueWindows) {
        try {
            const result = await activateMaintenanceWindow(db, win._id);
            started += 1;
            activeSessions += result.activeSessions;
            sessionsExtended += result.sessionsExtended;
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
            started,
            activeSessions,
            sessionsExtended,
            errors,
        },
    });
}