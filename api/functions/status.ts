/**
 * Public platform status -- used by the reviewee app on every page
 * load to detect maintenance mode quickly without an authed call.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../src/db.js";
import { getPlatformSettings } from "../src/platformSettings.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  try {
    const db = await getDb();
    const settings = await getPlatformSettings(db);

    res.status(200).json({
      success: true,
      data: {
        ok: true,
        maintenance: {
          isEnabled: Boolean(settings?.maintenance?.isEnabled),
          ...(settings?.maintenance?.isEnabled
            ? { message: settings.maintenance.message }
            : {}),
        },
        registration: {
          isOpen: settings?.registration?.isOpen !== false,
          allowEmailSignup: settings?.registration?.allowEmailSignup !== false,
        },
      },
    });
    return;
  } catch (err) {
    console.error("[status] failed to load platform settings", {
      error: err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
        : err,
    });

    res.status(200).json({
      success: true,
      data: {
        ok: true,
        maintenance: { isEnabled: false },
        registration: { isOpen: true, allowEmailSignup: true },
      },
    });
    return;
  }
}
