import type { Request, Response, NextFunction } from "express";
import { getDb } from "./db.js";
import { buildMaintenanceStatus } from "./maintenance.js";

const CACHE_MS = 30_000;
let cachedAt = 0;
let cachedStatus: Awaited<ReturnType<typeof buildMaintenanceStatus>> | null = null;

async function getCachedStatus() {
  const now = Date.now();
  if (cachedStatus && now - cachedAt < CACHE_MS) return cachedStatus;

  const db = await getDb();
  cachedStatus = await buildMaintenanceStatus(db);
  cachedAt = now;
  return cachedStatus;
}

export async function maintenanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const status = await getCachedStatus();
  res.setHeader("X-Maintenance-Mode", status.isActive ? "true" : "false");

  if (!status.isActive) {
    if (status.upcoming) {
      res.setHeader(
        "X-Upcoming-Maintenance",
        JSON.stringify({
          startsAt: status.upcoming.scheduledStart,
          title: status.upcoming.title,
        }),
      );
    }
    next();
    return;
  }

  const path = req.path || "";
  const isAdmin = path.startsWith("/api/admin/");
  const alwaysAllowed =
    path.startsWith("/api/health") ||
    path.startsWith("/api/maintenance/") ||
    path.startsWith("/api/sync/") ||
    isAdmin;

  if (alwaysAllowed) {
    next();
    return;
  }

  const active = status.currentWindow;
  if (!active) {
    next();
    return;
  }

  if (active.sessionHandling.allowActiveExamsToFinish) {
    const sessionRoute = /\/api\/(exam|practice|study-plan)\//.test(path);
    if (sessionRoute) {
      next();
      return;
    }
  }

  const blockStarts = /\/(exam|practice|study-plan)\/(start|generate)/.test(path);
  if (blockStarts) {
    const retryAfter = Math.max(
      30,
      Math.ceil((new Date(active.scheduledEnd).getTime() - Date.now()) / 1000),
    );
    res.setHeader("Retry-After", String(retryAfter));
    res.status(503).json({
      success: false,
      error: "maintenance",
      message: active.messaging.bannerMessage,
      estimatedEnd: active.scheduledEnd,
      retryAfter,
    });
    return;
  }

  if (active.type === "read_only" && req.method === "GET") {
    next();
    return;
  }

  const retryAfter = Math.max(
    30,
    Math.ceil((new Date(active.scheduledEnd).getTime() - Date.now()) / 1000),
  );
  res.setHeader("Retry-After", String(retryAfter));
  res.status(503).json({
    success: false,
    error: "maintenance",
    title: active.messaging.maintenancePageTitle,
    message: active.messaging.maintenancePageMessage,
    estimatedEnd: active.scheduledEnd,
    retryAfter,
    type: active.type,
  });
}
