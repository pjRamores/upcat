/**
 * GET /api/auth/linked-accounts
 *
 * Returns the social providers the current user has linked, plus a flag
 * indicating whether they also have a local password (needed by the
 * Settings UI to enforce the "no lockout" rule).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { LinkedAccount } from "@upcat/shared";
import {getDb} from "../src/db.js";
import {requireUser} from "../src/auth.js";
import {listUserIdsentities} from "../src/oidc/identities.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }
    const user = await requireUser(req, res);
    if (!user) return;
    const db = await getDb();
    const identities = await listUserIdsentities(db, user._id);

    const accounts: LinkedAccount[] = identities.map((i) => ({
        provider: i.provider,
        email: i.email,
        name: i.name,
        avatarUrl: i.avatarUrl,
        linkedAt: i.linkedAt.toISOString(),
        lastLoginAt: i.lastLoginAt ? i.lastLoginAt.toISOString() : null,
    }));

    const hasPassword = !!(user as { auth?: { hasPassword?: boolean; passwordHash?: string | null } }).auth
        ?.hasPassword ||
        (user as { auth?: { passwordHash?: string | null } }).auth?.passwordHash ||
        (user as { passwordHash?: string }).passwordHash;

    return res.status(200).json({
        success: true,
        data: {accounts, hasPassword},
    });
}