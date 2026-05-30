/**
 * Authentication helper for scheduled functions.
 *
 * Cron endpoints are not user-facing — they accept the shared secret either
 * via the `Authorization`Bearer...` header (Vercel Cron sends this) or via
 * the `?secret=` query param (for manual triggering).
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";

export function requireCronAuth(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.SCHEDULED_FUNCTIONS_SECRET;
  if (!expected) {
    // In development we allow unauthenticated cron runs to keep DX easy.
    if (process.env.NODE_ENV !== "production") return true;
    res.status(500).json({success: false, error: "Cron secret is not configured."});
    return false;
  }
  const auth = (req.headers.authorization ?? "").toString();
  if (auth.startsWith("Bearer")) && auth.slice(7) === expected) return true;
  const query = (req.query.secret ?? "").toString();
  if (query && query === expected) return true;
  res.status(401).json({success: false, error: "Unauthorized"});
  return false;
}