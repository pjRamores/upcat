import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../../src/db.js";
import {healthCheckRunner, summarizeHealth} from "../../src/monitoring/health.js";

function readMode(req: VercelRequest): "basic" | "detailed" | "public" {
  const mode = String(req.query.mode || "basic").toLowerCase();
  if (mode === "detailed") return "detailed";
  if (mode === "public") return "public";
  return "basic";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const mode = readMode(req);

  try {
    if (mode === "basic") {
      const summary = await summarizeHealth();
      return res.status(200).json({
        success: true,
        data: {
          ok: summary.overall !== "unhealthy",
          status: summary.overall,
          ts: Date.now(),
        },
      });
    }

    const db = await getDb();
    const checks = await healthCheckRunner.getChecks(db);
    const summary = await summarizeHealth(db);

    if (mode === "public") {
      return res.status(200).json({
        success: true,
        data: {
          status: summary.overall,
          checks: checks.map((check) => ({
            checkId: check.checkId,
            name: check.name,
            status: check.currentStatus,
            lastCheckAt: check.lastCheckAt,
            message: check.history[check.history.length - 1]?.message ?? null,
          })),
          ts: Date.now(),
        },
      });
    }

    return res.status(summary.overall === "unhealthy" ? 503 : 200).json({
      success: true,
      data: {
        overall: summary.overall,
        checks,
        ts: Date.now(),
      },
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      data: {
        ok: false,
        status: "unknown",
        ts: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}