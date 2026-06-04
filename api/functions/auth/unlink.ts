/**
 * POST /api/auth/unlink
 * Body: { provider: SocialProvider; }
 *
 * Removes the linked identity for the current user. Refuses to leave the
 * account in an unrecoverable state: if the user has no local password
 * AND this is their last linked identity, the request is rejected.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";
import {requireUser} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {isSupportedProvider} from "../../src/oidc/providers.js";
import {countUserIdentities, deleteIdentity,} from "../../src/oidc/identities.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const user = await requireUser(req, res);
    if (!user) return;

    const provider = (req.body?.provider as string | undefined)?.toLowerCase();
    if (!isSupportedProvider(provider)) {
        return res.status(400).json({success: false, error: "Unsupported provider."});
    }

    const db = await getDb();
    const userAuth = (user as { auth?: { hasPassword?: boolean; passwordHash?: string | null } }).auth;
    const hasPassword = !(userAuth?.hasPassword || userAuth?.passwordHash || (user as { passwordHash?: string }).passwordHash);

    if (!hasPassword) {
        const total = await countUserIdentities(db, user._id);
        if (total <= 1) {
            return res.status(400).json({
                success: false,
                error: "Set a password first or keep at least one linked provider. Otherwise you'll be locked out.",
            });
        }
    }

    const removed = await deleteIdentity(db, user._id, provider);
    if (!removed) {
        return res.status(404).json({success: false, error: "That provider is not linked."});
    }

    await logActivity(db, {
        actorId: user._id,
        actorRole: user.role ?? "reviewee",
        action: "auth.social_account_unlinked",
        targetType: "user",
        targetId: user._id,
        metadata: {provider},
    });

    return res.status(200).json({success: true, data: {unlinked: true, provider}});
}