import { type } from "@vercel/node";
import { ObjectId } from "mongodb";
import { extractToken } from "../src/auth.js";
import { getDb } from "../../src/db.js";
import { createLogger } from "../../../src/monitoring/logger.js";

const logger = createLogger("client");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = { req.body ?? {} } as {
    message?: unknown;
    stack?: unknown;
    componentStack?: unknown;
    url?: unknown;
    userAgent?: unknown;
    tags?: unknown;
    metadata?: unknown;
    severity?: unknown;
  };

  const message = typeof body.message === "string" ? body.message.slice(0, 500) : "Client error";
  const stack = typeof body.stack === "string" ? body.stack.slice(0, 4000) : null;
  const componentStack = typeof body.componentStack === "string" ? body.componentStack.slice(0, 2000) : null;
  const url = typeof body.url === "string" ? body.url.slice(0, 1000) : null;
  const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : null;
  const severity = body.severity === "warn" ? "warn" : "error";
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 10)
    : [];

  const token = extractToken(req);
  const userId = token?.userId && ObjectId.isValid(token.userId) ? token.userId : null;

  try {
    const payload = {
      message,
      url,
      userAgent,
      stack,
      componentStack,
      metadata: typeof body.metadata === "object" && body.metadata ? body.metadata as Record<string, unknown> : null,
      tags,
      origin: "browser",
      userId,
    };
    if (severity === "warn") logger.warn("client.error", payload);
    else logger.error("client.error", null, payload);

    const db = await getDb();
    await db.collection("application_logs").insertOne({
      timestamp: new Date(),
      level: severity,
      message,
      context: {
        service: "client",
        environment: process.env.NODE_ENV || "development",
        version: process.env.APP_VERSION || "dev",
        instance: "browser",
        region: null,
      },
      request: {
        requestId: null,
        traceId: null,
        spanId: null,
        parentSpanId: null,
        method: null,
        path: url,
        ip: req.headers["x-forwarded-for"] || null,
        userAgent,
        userId,
        sessionId: null,
        statusCode: null,
        duration: null,
      },
      error: {
        name: "ClientError",
        message,
        stack,
        code: null,
        originalError: componentStack ? { componentStack } : null,
      },
      data: typeof body.metadata === "object" && body.metadata ? body.metadata : null,
      tags: ["client-error", ...tags],
      performance: null,
      trace: null,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to record client error",
    });
  }
}