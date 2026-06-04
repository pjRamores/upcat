/**
 * DELETE /api/account
 * Body: { confirmation: "DELETE MY ACCOUNT", password?: string }
 *
 * Permanently removes the current user's account. Requires:
 * 1. Exact typed confirmation phrase.
 * 2. Password re-auth when the user has a local password.
 * (Social-only users rely on a freshly-issued JWT, which already proves
 * a recent successful provider sign-in within the JWT lifetime.)
 *
 * Cleanup performed:
 * - All user identities deleted.
 * - exam_sessions anonymized (userId set to null) so aggregate stats survive.
 * - contact_messages authored by the user are deleted.
 * - tombstone written to deletion_log (sha-256 of email).
 * - user document deleted; tokens invalidated first.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as bcrypt from "node-rs/bcrypt";
import crypto from "node:crypto";
import { ACCOUNT_DELETE_CONFIRMATION } from "@upcat/shared";
import {getDb} from "../src/db.js";
import {requireUser} from "../src/auth.js";
import {logActivity} from "../src/activityLog.js";
import {deleteAllIdentitiesForUser} from "../src/oidc/identities.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "DELETE" && req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const user = await requireUser(req, res);
    if (!user) return;

    // Hard guard: never allow the seeded admin to nuke themselves through this
    // endpoint -- admin accounts must be removed via the admin user management UI.
    if ((user.role ?? "reviewee") === "admin") {
        return res.status(403).json({
            success: false,
            error: "Admin accounts cannot be self-deleted. Use the admin users panel.",
        });
    }

    const {confirmation, password} = (req.body ?? {}) as {
        confirmation?: string;
        password?: string;
    };

    if (confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
        return res.status(400).json({
            success: false,
            error: "Please type '${ACCOUNT_DELETE_CONFIRMATION}' exactly to confirm.",
        });
    }

    const userAuth = (user as { auth?: { passwordHash?: string | null; hasPassword?: boolean } })
        .auth;
    const passwordHash =
        userAuth?.passwordHash ?? (user as { passwordHash?: string }).passwordHash ?? null;
    const hasPassword = !!(userAuth?.hasPassword || passwordHash);

    if (hasPassword) {
        if (!password) {
            return res
                .status(400)
                .json({success: false, error: "Password is required to delete your account."});
        }
        if (!passwordHash || !(await bcrypt.verify(password, passwordHash))) {
            return res.status(401).json({success: false, error: "Incorrect password."});
        }
    }

    const db = await getDb();
    const now = new Date();

    // 1. Invalidate any outstanding tokens before we delete the row.
    await db
        .collection("users")
        .updateOne({_id: user._id}, {$set: {tokenInvalidatedAt: now}});

    // 2. Wipe identities.
    await deleteAllIdentitiesForUser(db, user._id);

    // 3. Anonymize exam sessions so historical analytics survive.
    await db
        .collection("exam_sessions")
        .updateMany({userId: user._id}, {$set: {userId: null, anonymizedAt: now}});

    // 4. Remove personally-identifying records the user authored.
    await db.collection("contact_messages").deleteMany({userId: user._id});
    await db.collection("question_flags").updateMany(
        {userId: user._id},
        {$set: {userId: null, anonymizedAt: now}},
    );

    // 5. Audit tombstone (no PII -- email is hashed).
    const emailHash = crypto.createHash("sha256").update(user.email).digest("hex");
    await db.collection("deletion_log").insertOne({
        userId: user._id,
        emailHash,
        role: user.role ?? "reviewee",
        deletedAt: now,
    });

    // 6. Delete the user record itself.
await db.collection("users").deleteOne({_id: user._id});

await logActivity(db, {
    actorId: user._id,
    actorRole: user.role ?? "reviewee",
    action: "auth.account_deleted",
    targetType: "user",
    targetId: user._id,
    metadata: {emailHash},
});

return res.status(200).json({success: true, data: {deleted: true}});