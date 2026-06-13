import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../src/auth.js";
import { isPremiumActive, normalizeSubscription } from "../../src/subscription.js";

type UserLike = Record<string, unknown> & {
  _id: { toString(): string };
  role?: string;
  isActive?: boolean;
  passwordHash?: string | null;
  auth?: {
    hasPassword?: boolean;
    passwordHash?: string | null;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const user = (await requireUser(req, res)) as UserLike | null;
  if (!user) return;

  const {
    passwordHash: _pw,
    auth,
    verificationToken: _vt,
    verificationTokenExpiry: _vte,
    resetToken: _rt,
    resetTokenExpiry: _rte,
    tokenInvalidatedAt: _tia,
    ...safe
  } = user;

  void _pw;
  void _vt;
  void _vte;
  void _rt;
  void _rte;
  void _tia;

  const hasPassword = !!(auth?.hasPassword || auth?.passwordHash || user.passwordHash);
  const subscription = normalizeSubscription(user);

  return res.status(200).json({
    success: true,
    data: {
      ...safe,
      _id: user._id.toString(),
      role: user.role ?? "reviewee",
      isActive: user.isActive ?? true,
      subscription,
      premium: isPremiumActive(subscription),
      hasPassword,
      socialOnly: !hasPassword,
    },
  });
}
