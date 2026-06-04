import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const db = await getDb();
    const body = (req.body ?? {}) as {
        sessionId?: string;
        sessionType?: string;
        snapshot?: Record<string, unknown>;
        deviceId?: string;
    };

    if (!body.sessionId || !ObjectId.isValid(body.sessionId) || !body.snapshot) {
        return res.status(400).json({ success: false, error: "sessionId and snapshot are required" });
    }

    const sessionId = new ObjectId(body.sessionId);
    const current = await db.collection("session_recovery").findOne({ userId: user._id, sessionId, status: "active" });
    const nextVersion = Number((current as { version?: number } | null)?.version || 0) + 1;

    await db.collection("session_recovery").updateOne(
        { userId: user._id, sessionId },
        {
            $set: {
                userId: user._id,
                sessionId,
                sessionType: body.sessionType || "mock_exam",
                snapshot: {
                    ...body.snapshot,
                    capturedAt: new Date(),
                    deviceId: body.deviceId || "unknown",
                },
                status: "active",
                recoveredAt: null,
                recoveredOnDevice: null,
                version: nextVersion,
                updatedAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            $setOnInsert: {
                createdAt: new Date(),
            },
            { upsert: true },
        }
    );

    return res.status(200).json({ success: true, data: { saved: true, version: nextVersion } });
}