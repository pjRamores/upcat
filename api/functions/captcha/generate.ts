/**
 * POST /api/captcha/generate
 *
 * Issues a fresh CAPTCHA challenge.
 * Body: `{ type?: "math"|"image"| "puzzle"|"pow" }`.
 * Omitting `type` returns a proof-of-work challenge (invisible to humans).
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { CAPTCHA_TYPES, type CaptchaType } from "@upcat/shared";
import { generateCaptcha } from "../../src/security/captcha.js";
import { withSecurity } from "../../../../src/security/middleware.js";

export default withSecurity({ endpoint: "POST /api/captcha/generate" })(async (
  req: VercelRequest,
  res: VercelResponse,
  ctx,
) => {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  const body = (req.body ?? {}) as { type?: string; elevated?: boolean };
  const type =
    typeof body.type === "string" &&
    CAPTCHA_TYPES as readonly string[].includes(body.type)
      ? (body.type as CaptchaType)
      : undefined;
  // Soft-blocked / elevated risk IPs get harder PoW automatically.
  const elevated = ctx.isSoftBlocked || body.elevated === true;
  const payload = await generateCaptcha({ type, elevated });
  res.status(200).json({ success: true, data: payload });
});