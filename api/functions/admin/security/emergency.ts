/**
 * Admin - Emergency lockdown enable/disable.
 * POST /api/admin/security/emergency/lockdown ··· {confirmCode: "LOCKDOWN", password}
 * POST /api/admin/security/emergency/unlock ··· {password}
 *
 * When lockdown is on, `withSecurity` rejects every non-admin request with
 * 503. Admins remain able to manage the system.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {withSecurity} from "../../src/security/middleware.js";
import {invalidateSecurityConfig} from "../../src/security/config.js";
import {logSecurityEvent} from "../../src/security/events.js";

export default withSecurity({endpoint: "ADMIN /api/admin/security/emergency"})(async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({success: false, error: "Method not allowed"});
    return;
  }
  const url = req.url || "";
  const enabling = url.includes("/lockdown");
  const body = (req.body ?? {}).as({confirmCode?: string; password?: string});

  if (enabling && body.confirmCode !== "LOCKDOWN") {
    res.status(400).json({success: false, error: "confirmCode must be 'LOCKDOWN'"});
    return;
  }
  if (!body.password) {
    res.status(400).json({success: false, error: "Password required"});
    return;
  }
  const db = await getDb();
  const fullAdmin = await db
    .collection("users")
    .findOne({_id: admin._id}, {projection: {passwordHash: 1}});
  if (!fullAdmin?.passwordHash || !(await bcrypt.verify(body.password, fullAdmin.passwordHash))) {
    res.status(401).json({success: false, error: "Invalid password"});
    return;
  }
  await db.collection("security_config").updateOne(
    {_id: "global" as never},
    {
      $set: {
        "lockdown.enabled": enabling,
        "lockdown.enabledAt": enabling ? new Date() : null,
        "lockdown.enabledBy": enabling ? admin._id : null,
        updatedAt: new Date(),
        updatedBy: admin._id,
      },
    },
    {upsert: true},
  );
  invalidateSecurityConfig();
  await logSecurityEvent({
    type: enabling ? "admin.lockdown_enabled" : "admin.lockdown_disabled",
    severity: "critical",
    source: {ip: "admin", userId: admin._id.toString()},
    action: {taken: enabling ? "lockdown_on" : "lockdown_off", automated: false},
  });
  res.status(200).json({success: true, data: {lockdown: enabling}});
});