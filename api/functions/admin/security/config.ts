/**
 * Admin - Security config get/update.
 * GET /api/admin/security/config
 * PUT /api/admin/security/config { config: Partial<SecurityConfig>, password: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { withSecurity } from "../../src/security/middleware.js";
import { getSecurityConfig, invalidateSecurityConfig } from "../../src/security/config.js";
import { logSecurityEvent } from "../../src/security/events.js";

export default withSecurity({ endpoint: "ADMIN/api/admin/security/config" }) (async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    const cfg = await getSecurityConfig();
    res.status(200).json({ success: true, data: cfg });
    return;
  }

  if (req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}).as { config?: Record<string, unknown>; password?: string };
  if (!body.password || typeof body.password !== "string") {
    res.status(400).json({ success: false, error: "Password required for config change" });
    return;
  }

  const db = await getDb();
  const fullAdmin = await db
    .collection("users")
    .findOne({ _id: admin._id }, { projection: { passwordHash: 1 } });
  if (!fullAdmin?.passwordHash || !(await bcrypt.verify(body.password, fullAdmin.passwordHash))) {
    res.status(401).json({ success: false, error: "Invalid password" });
    return;
  }

  if (!body.config || typeof body.config !== "object") {
    res.status(400).json({ success: false, error: "config object required" });
    return;
  }

  await db.collection("security_config").updateOne(
    { _id: "global" as never },
    {
      $set: {
        body.config,
        updatedAt: new Date(),
        updatedBy: admin._id,
      },
    },
    { upsert: true },
  );
  invalidateSecurityConfig();

  await logSecurityEvent({
    type: "admin.config_changed",
    severity: "high",
    source: { ip: "admin", userId: admin._id.toString() },
    details: { keys: Object.keys(body.config) },
    action: { taken: "config_update", automated: false },
  });

  const cfg = await getSecurityConfig();
  res.status(200).json({ success: true, data: cfg });
});