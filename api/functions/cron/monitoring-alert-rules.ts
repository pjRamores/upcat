import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireCronAuth} from "../../src/cronAuth.js";
import {evaluateAlertRules} from "../../src/monitoring/alerts.js";
import {metricsCollector} from "../../src/monitoring/metrics.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;
    const db = await getDb();
    const result = await evaluateAlertRules(db);
    await metricsCollector.flush(db);
    res.status(200).json({success: true, data: result});
}