import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireCronAuth} from "../../src/cronAuth.js";
import {healthCheckRunner} from "../../src/monitoring/health.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;
    const db = await getDb();
    const result = await healthCheckRunner.runDueChecks(db);
    res.status(200).json({success: true, data: result});
}