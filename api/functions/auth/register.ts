import type {VercelRequest, VercelResponse} from "@vercel/node";
import * as bcrypt from "@node-rs/bcrypt";
import crypto from "node:crypto";
import {getDb} from "../../src/db.js";
import {sendVerificationEmail} from "../../src/email.js";
import {logActivity} from "../../src/activityLog.js";
import {getPlatformSettings} from "../../src/platformSettings.js";
import {defaultSubscription} from "../../src/subscription.js";
import {validateEmail, validatePassword, VERIFICATION_TOKEN_EXPIRY_HOURS} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const {firstName, lastName, email, password, confirmPassword} = req.body ?? {};

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.status(400).json({success: false, error: "All fields are required."});
  }

  if (!validateEmail(email)) {
    return res.status(400).json({success: false, error: "Invalid email format."});
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.isValid) {
    return res.status(400).json({
      success: false,
      error: `Password requirements not met: ${pwCheck.errors.join(", ")}.`,
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({success: false, error: "Passwords do not match."});
  }

  const db = await getDb();
  const settings = await getPlatformSettings(db);

  if (settings.registration.isOpen === false) {
    return res
      .status(403)
      .json({success: false, error: "New registrations are temporarily disabled."});
  }

  if (settings.registration.allowEmailSignup === false) {
    return res.status(403).json({
      success: false,
      error: "Email sign-up is disabled. Please continue with a social login provider.",
    });
  }

  const users = db.collection("users");

  const existing = await users.findOne({email: email.toLowerCase()});
  if (existing) {
    return res.status(409).json({success: false, error: "An account with this email already exists."});
  }

  const requireVerify = settings.registration.requireEmailVerification !== false;
  const emailSendTimeoutMs = Number(process.env.EMAIL_SEND_TIMEOUT_MS ?? 5000);
  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = requireVerify ? crypto.randomBytes(32).toString("hex") : undefined;
  const verificationTokenExpiry = requireVerify
    ? new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    : undefined;
  const now = new Date();

  // Public /register cannot create admins; role is always reviewee.
  const insert = await users.insertOne({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    auth: {hasPassword: true, passwordHash, tokenInvalidatedAt: null},
    role: "reviewee",
    premium: false,
    subscription: defaultSubscription(),
    isActive: true,
    isVerified: !requireVerify,
    loginCount: 0,
    lastLoginAt: null,
    deactivatedAt: null,
    deactivatedBy: null,
    notes: null,
    ...(verificationToken ? {verificationToken, verificationTokenExpiry} : {}),
    createdAt: now,
    updatedAt: now,
  });

  if (requireVerify && verificationToken) {
    try {
      await Promise.race([
        sendVerificationEmail(email.toLowerCase().trim(), verificationToken),
        new Promise<void>() => {
          setTimeout(() => reject(new Error(`verification email timed out after ${emailSendTimeoutMs}ms`)), emailSendTimeoutMs);
        }),
      ]);
    } catch (emailError) {
      // Keep registration successful even when email delivery is delayed/unavailable.
      console.warn("[auth/register] verification email delivery issue", emailError);
    }
  }
}
await logActivity(db, {
  actorId: insert.insertedId,
  actorRole: "reviewee",
  action: "user.registered",
  targetType: "user",
  targetId: insert.insertedId,
  metadata: {email: email.toLowerCase().trim()},
});
return res.status(201).json({
  success: true,
  data: {
    message: requireVerify
    ? "Registration successful. Please check your email."
    : "Registration successful. You can now sign in.",
  },
});
}