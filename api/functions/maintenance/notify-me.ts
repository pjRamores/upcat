import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    const body = (req.body ?? {}) as {
        email?: string;
        channels?: string[];
        windowId?: string | null;
        locale?: string;
    };

    if (!body.email || !/^\S+@\S+\.\S+$/.test(body.email)) {
        return res.status(400).json({success: false, error: "Valid email is required"});
    }

    const db = await getDb();
    await db.collection("maintenance_notifications").updateOne(
        {email: body.email.toLowerCase()},
        {
            $set: {
                email: body.email.toLowerCase(),
                channels: Array.isArray(body.channels) && body.channels.length > 0 ? body.channels : ["email"],
                windowId: body.windowId ?? null,
                locale: body.locale || "en",
                unsubscribed: false,
                updatedAt: new Date(),
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
            $setOnInsert: {
                createdAt: new Date(),
            },
            {upsert: true},
        }
    );

    return res.status(200).json({success: true, data: {subscribed: true}});
}