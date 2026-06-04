import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import {getDb} from "../../src/db.js";
import {sendPasswordResetEmail} from "../../src/email.js";
import {RESET_TOKEN_EXPIRY_HOURS} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    const {email} = req.body ?? {};

    // Always return 200 to prevent email enumeration
    const successResponse = {
        success: true,
        data: {message: "If that email exists, a reset link has been sent."},
    };

    if (!email || typeof email !== "string") {
        return res.status(200).json(successResponse);
    }

    const db = await getDb();
    const users = db.collection("users");
    const user = await users.findOne({email: email.toLowerCase().trim()});

    if (!user) {
        return res.status(200).json(successResponse);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(
        Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await users.updateOne(
        {_id: user._id},
        {$set: {resetToken, resetTokenExpiry, updatedAt: new Date()}},
    );

    await sendPasswordResetEmail(user.email, resetToken);

    return res.status(200).json(successResponse);
}