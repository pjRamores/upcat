import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../..../src/auth.js";
import { isPremiumActive, normalizeSubscription } from "../../../../../src/subscription.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    // Strip sensitive fields before returning to the client.
    const {
        passwordHash: _pw,
        auth: authBlock,
        verificationToken: _vt,
        verificationTokenExpiry: _vte,
        resetToken: _rt,
        resetTokenExpiry: _rte,
        tokenInvalidatedAt: _tia,
        ...safe
    } = user as Record<string, unknown> & {
        passwordHash?: unknown;
        auth?: { hasPassword?: boolean; passwordHash?: string | null };
    };

    void _pw;
    void _vt;
    void _vte;
    void _rt;
    void _rte;
    void _tia;

    const hasPassword = !!(authBlock as { hasPassword?: boolean; passwordHash?: string | null } | undefined)?.hasPassword ||
        (authBlock as { passwordHash?: string | null } | undefined)?.passwordHash ||
        (user as { passwordHash?: string }).passwordHash;

    return res.status(200).json({
        success: true,
        data: {
            ...safe,
            _id: user._id.toString(),
            role: user.role ?? "reviewee",
            isActive: user.isActive ?? true,
            subscription: normalizeSubscription(user as unknown as Record<string, unknown>),
            premium: isPremiumActive(normalizeSubscription(user as unknown as Record<string, unknown>)),
            hasPassword,
            socialOnly: !hasPassword,
        },
    });
}