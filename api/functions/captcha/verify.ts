/**
 * POST /api/captcha/verify
 *
 * Body: `{ captchaId: string, answer: unknown, elapsedMs?: number }`.
 * On success returns `{ valid: true, token }` -- pass `token` as
 * `X-Captcha-Token` on the gated follow-up request.
 *
 * On failure increments the source IP's threat score (15 normally, 30
 * after repeated failures) and logs a security event.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CaptchaVerifyResponse } from "@upcat/shared";
import { verifyCaptcha } from "../../src/security/captcha.js";
import { withSecurity } from "../../src/security/middleware.js";
import { logSecurityEvent } from "../../src/security/events.js";
import { adjustThreatScore } from "../../src/security/ipIntel.js";

export default withSecurity({ endpoint: "POST /api/captcha/verify" }) (async {
  req: VercelRequest,
  res: VercelResponse,
  ctx,
}) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  const body = (req.body ?? {}).as({ captchaId?: string; answer?: unknown; elapsedMs?: number });
  if (!body.captchaId || typeof body.captchaId !== "string") {
    res.status(400).json({ success: false, error: "captchaId is required" });
    return;
  }

  const result = await verifyCaptcha(body.captchaId, body answer, {
    elapsedMs: typeof body.elapsedMs === "number" ? body.elapsedMs : undefined,
  });

  if (!result.valid) {
    void logSecurityEvent({
      type: "bot.captcha_failed",
      severity: "low",
      source: {
        ip: ctx.clientIp,
        userId: null,
        userAgent: ctx.userAgent,
        fingerprint: ctx.fingerprint,
        country: null,
      },
      target: { type: "captcha", value: body.captchaId },
      details: { reason: result.reason ?? "unknown", type: result.type ?? null },
      action: { taken: "rejected", automated: true },
    });
    void adjustThreatScore(ctx.clientIp, "captcha_failed");
    const payload: CaptchaVerifyResponse = { valid: false, token: null };
    res.status(200).json({ success: true, data: payload });
    return;
  }

  const payload: CaptchaVerifyResponse = { valid: true, token: result.token ?? null };
  res.status(200).json({ success: true, data: payload });
});