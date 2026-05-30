/**
 * Public platform status — used by the reviewee app on every page
 * load to detect maintenance mode quickly without an authed call.
 * GET/api/status
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../src/db.js";
import {getPlatformSettings} from "../src/platformSettings.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    try {
        const db = await getDb();
        const settings = await getPlatformSettings(db);
        return res.status(200).json({
            success: true,
            data: {
                ok: true,
                maintenance: {
                    isEnabled: settings.maintenance.isEnabled,
                    ...(settings.maintenance.isEnabled ? {message: settings.maintenance.message} : {}),
                },
                registration: {
                    isOpen: settings.registration.isOpen,
                    allowEmailSignup: settings.registration.allowEmailSignup !== false,
                },
            },
        });
    } catch {
        return res.status(200).json({
            success: true,
            data: {
                ok: true,
                maintenance: {isEnabled: false},
                registration: {isOpen: true, allowEmailSignup: true},
            },
        });
    }
}