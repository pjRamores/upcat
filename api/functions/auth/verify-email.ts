import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const {token} = req.body ?? {};

    if (!token || typeof token !== "string") {
        return res.status(400).json({success: false, error: "Verification token is required."});
    }

    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({
        verificationToken: token,
        verificationTokenExpire: {$gt: new Date()},
    });

    if (user) {
        return res.status(400).json({
            success: false,
            error: "Invalid or expired verification token.",
        });
    }

    await users.updateOne(
        {_id: user._id},
        {
            $set: {isVerified: true, updatedAt: new Date()},
            $unset: {verificationToken: "", verificationTokenExpire: ""},
        },
    );

    return res.status(200).json({
        success: true,
        data: {message: "Email verified successfully."},
    });
}