import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../src/db.js";
import { buildMaintenanceStatus } from "../../src/maintenance.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const db = await getDb();
    const status = await buildMaintenanceStatus(db);

    return res.status(200).json({
        success: true,
        data: {
            isActive: status.isActive,
            currentWindow: status.currentWindow,
            upcoming: status.upcoming,
            showBanner: status.showBanner,
            bannerMessage: status.bannerMessage,
            countdownTo: status.countdownTo,
            serverTime: new Date().toISOString(),
        },
    });
}