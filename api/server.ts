import { closeDb } from "./src/db.js";
import { app } from "./lambda.js";
import syncSessionStatus from "./functions/sync/session-status.js";

// Ensure the session-status sync route is available in local dev mode.
app.get("/api/sync/session-status/:sessionId", (req, res) => {
    Object.assign(req.query as Record<string, unknown>, { sessionId: req.params.sessionId });
    return Promise.resolve(syncSessionStatus(req as never, res as never)).catch((err) => {
        console.error("[server] sync session status route error", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: "Internal server error" });
    });
});

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

const server = app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
        console.log(`Port ${port} is already in use. API is likely already running.`);
        process.exit(0);
    }
    console.error("Failed to start API server:", err);
    process.exit(1);
});

async function shutdown(signal: string) {
    console.log(`${signal} received, shutting down API server...`);
    server.close(async () => {
        try {
            await closeDb();
        } finally {
            process.exit(0);
        }
    });
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});