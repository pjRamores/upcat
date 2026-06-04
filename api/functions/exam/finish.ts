import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * @deprecated Use POST /api/exam/:sessionId/submit instead.
 * Kept as a 410 stub during migration.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
    return res.status(410).json({
        success: false,
        error: "This endpoint has been replaced by POST /api/exam/:sessionId/submit",
    });
}