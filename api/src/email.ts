import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || "http://localhost:5173";
const FROM = "UPCAT_Simulator <noreply@upcat-sim.com>";

function escape(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function panel(inner: string, accent = "#4f46e5"): string {
    return `
    <div style="font-family:apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#ffffff">
        <div style="border-top:4px solid ${accent};padding:24px 0">
            ${inner}
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">
            UPCAT Simulator Â· automated message Â€ please do not reply directly.
        </p>
    </div>
`;

async function safeSend(args: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
}): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        // eslint-disable-next-line no-console
        console.log(`[email:noop] to=${args.to} subject=${args.subject}`);
        return;
    }
    await resend.emails.send({
        from: FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    });
}

export async function sendVerificationEmail(
    to: string,
    token: string,
): Promise<void> {
    const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

    await resend.emails.send({
        from: FROM,
        to,
        subject: "Verify your email Â€ UPCAT Simulator",
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="color:#4f46e5">Welcome to UPCAT Simulator!</h2>
                <p>Click the button below to verify your email address:</p>
                <p style="text-align:center;margin:32px 0">
                    <a href="${verifyUrl}" style="background:#4f46e5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
                </p>
                <p style="color:#64748b;font-size:14px">This link expires in 24 hours.</p>
                <p style="color:#64748b;font-size:14px">If you didn't create an account, you can ignore this email.</p>
            </div>
        `,
    });
}

export async function sendPasswordResetEmail(
    to: string,
    token: string,
): Promise<void> {
    const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

    await resend.emails.send({
        from: FROM,
        to,
        subject: "Reset your password Â€ UPCAT Simulator",
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="color:#4f46e5">Password Reset Request</h2>
                <p>Click the button below to reset your password:</p>
                <p style="text-align:center;margin:32px 0">
                    <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
                </p>
                <p style="color:#64748b;font-size:14px">This link expires in 1 hour.</p>
                <p style="color:#64748b;font-size:14px">If you didn't request a password reset, you can ignore this email.</p>
            </div>
        `,
    });
}

export async function sendContactNotification(payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
    ip?: string;
}): Promise<void> {

const to = process.env.DEVELOPER_EMAIL;
if (!to || !process.env.RESEND_API_KEY) {
    return;
}
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
await resend.emails.send({
    from: FROM,
    to,
    replyTo: payload.email,
    subject: `[UPCAT Contact] ${payload.subject} ${payload.name}`,
    html:
        `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#4f46e5">New contact-form message</h2>
        <table style="font-size:14px;color:#334155">
            <tr><td style="padding:4px 12px 4px 0"><strong>Name</strong></td><td>${escape(payload.name)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${escape(payload.email)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Subject</strong></td><td>${escape(payload.subject)}</td></tr>
            ${payload.ip ? <tr><td style="padding:4px 12px 4px 0"><strong>IP</strong></td><td>${escape(payload.ip)}</td></tr> : ""}
        </table>
        <hr style="border:none;border-top:1px solid #e2e5f0;margin:16px 0" />
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;color:#0f172a">${escape(payload.message)}</pre>
        </div>
        `,
});
/**
 * Notifies a user that their account has been deactivated or
 * reactivated by an admin. Silently no-ops if Resend isn't
 * configured (dev/.CI).
 */
export async function sendAccountStatusEmail(
    to: string,
    status: "deactivated" | "reactivated",
): Promise<void> {
    if (!process.env.RESEND_API_KEY) return;
    const isDeact = status === "deactivated";
    await resend.emails.send({
        from: FROM,
        to,
        subject: isDeact ? "Your UPCAT Simulator account has been deactivated" : "Your UPCAT Simulator account has been reactivated",
        html:
            `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:${isDeact ? "#dc2626" : "#16a34a"}">
                Account ${isDeact ? "deactivated" : "reactivated"}
            </h2>
            <p style="color:#334155">
                ${isDeact ? "Your account has been deactivated by an administrator. You will no longer be able to sign in." + "If you believe this is in error, please contact support." : "Your account has been reactivated. You can now sign in again at " + <a href="${APP_URL}/login">${APP_URL}/login</a>.}
            </p>
            </div>
            `,
    });
}

// ── Phase 11: notification templates ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
to: string,
scheduledFor: Date,
): Promise<void> {
    await safeSend({
        to,
        subject: "Deletion confirmed -- scheduled for execution",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Deletion confirmed</h2>
            <p style="color:#334155">Your account is scheduled for permanent deletion on <strong>${scheduledFor.toUTCString()}</strong>. You can cancel any time before that date by signing in and going to Settings → Data &amp; Privacy.</p>`,
        ),
    });
}

export async function sendDeletionExecutedEmail(to: string): Promise<void> {
    await safeSend({
        to,
        subject: "Your UPCAT account has been deleted",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Account deleted</h2>
            <p style="color:#334155">As requested, your account and personal data have been permanently removed from UPCAT Simulator. Thank you for using the service.</p>`,
        ),
    });
}

export async function sendDeletionCancelledEmail(to: string): Promise<void> {
    await safeSend({
        to,
        subject: "Account deletion cancelled",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Deletion cancelled</h2>
            <p style="color:#334155">Your pending account-deletion request has been cancelled. Your account remains active.</p>`,
        ),
    });
}

export async function sendTicketReceivedEmail(
    to: string,
    args: { ticketNumber: string; subject: string },
): Promise<void> {
    await safeSend({
        to,
        subject: `[${args.ticketNumber}] We received your support request`,
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Support ticket received</h2>
            <p style="color:#334155">We've recorded your request – reference: <strong>${args.ticketNumber}</strong>.</p>
            <p style="color:#334155">Subject: ${escape(args.subject)}</p>
            <p style="color:#64748b;font-size:13px">An admin will review your ticket shortly. We'll email you when there's an update.</p>`,
        ),
    });
}

export async function sendTicketUpdateEmail(
    to: string,
    args: {
        ticketNumber: string;
        updateType: "reply" | "status" | "resolved";
        previewUrl: string;
        summary: string;
    },
): Promise<void> {
    const titleMap = {
        reply: "New reply on your ticket",
        status: "Status update on your ticket",
        resolved: "Your ticket has been resolved",
    } as const;
    await safeSend({
        to,
        subject: `[${args.ticketNumber}] ${titleMap[args.updateType]}`,
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">${escape(args.summary)}</h2>
            <p style="text-align:center;margin:24px 0"></p>
            <a href="${args.previewUrl}" style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">View ticket</a>
        </p>`,
    });
}

export async function sendAccountMergedEmail(
    to: string,
    args: { keptEmail: string },
): Promise<void> {
    await safeSend({
        to,
        subject: "Your UPCAT account was merged",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Account merge completed</h2>
            <p style="color:#334155">Your accounts have been merged by support. The primary account remains as: <strong>${escape(args.keptEmail)}</strong>. Use that email to sign in going forward.</p>`,
        ),
    });
}

export async function sendDisputeNotificationEmail(
    to: string,
    args: { ticketNumber: string; provider: string; ownerOrClaimant: "owner" | "claimant" },
): Promise<void> {
    const subject = args.ownerOrClaimant === "owner"
        ? `An identity dispute has been opened against your linked ${args.provider} account`
        : `Your identity dispute has been opened – reference ${args.ticketNumber}`;
    await safeSend({
        to,
        subject,
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Identity dispute opened</h2>
            <p style="color:#334155">We've received a request to resolve a dispute regarding your ${args.provider} account. This may take some time to resolve. We'll keep you updated.</p>`,
        ),
    });
}
export async function sendDisputeResolvedEmail(
    to: string,
    args: { ticketNumber: string; outcome: string },
): Promise<void> {
    await safeSend({
        to,
        subject: `Identity dispute resolved - ${args.ticketNumber}`,
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Dispute resolved</h2>
            <p style="color:#334155">Reference: <strong>${args.ticketNumber}</strong></p>
            <p style="color:#334155">Outcome: ${escape(args.outcome)}</p>`,
        ),
    });
}

export async function sendAccountLockedEmail(
    to: string,
    args: { unlockMinutes: number; recoverUrl: string },
): Promise<void> {
    await safeSend({
        to,
        subject: "Your UPCAT account has been temporarily locked",
        html: panel(
            `<h2 style="color:#b45309;margin:0 0 12px">Account locked</h2>
            <p style="color:#334155">We detected too many failed sign-in attempts and locked your account for <strong>${args.unlockMinutes} minutes</strong>.</p>
            <p style="color:#334155">If this wasn't you, use a recovery code or your security questions to regain access:</p>
            <p style="text-align:center;margin:24px 0">
                <a href="${args.recoverUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Recover account</a>
            </p>`,
        ),
    });
}

export async function sendInactivityReminderEmail(to: string): Promise<void> {
    await safeSend({
        to,
        subject: "We miss you at UPCAT Simulator",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">We haven't seen you in a while</h2>
            <p style="color:#334155">Your account is still active. Sign in to keep practicing and stay sharp.</p>
            <p style="text-align:center;margin:24px 0">
                <a href="${APP_URL}/login" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a>
            </p>`,
        ),
    });
}

export async function sendPaymentSubmissionReceivedEmail(
    to: string,
    args: { submissionNumber: string; amount: number; processingMessage: string },
): Promise<void> {
    await safeSend({
        to,
        subject: `Payment Received - Under Review (${args.submissionNumber})`,
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Payment submission received</h2>
            <p style="color:#334155">Reference: <strong>${escape(args.submissionNumber)}</strong></p>
            <p style="color:#334155">Amount: <strong>PHP ${args.amount.toFixed(2)}</strong></p>
            <p style="color:#334155">${escape(args.processingMessage)}</p>
            <p style="color:#6474ab;font-size:13px">You can track your submission status in Settings → My Payments.</p>`,
        ),
    });
}

export async function sendPaymentApprovedEmail(
    to: string,
    args: { planName: string; endDate: string | null },
): Promise<void> {
    await safeSend({
        to,
        subject: "Welcome to Premium!",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Your payment has been approved</h2>
            <p style="color:#334155">Plan: <strong>${escape(args.planName)}</strong></p>
            <p style="color:#334155">${args.endDate ? "Premium active until <strong>" + new Date(args.endDate).toUTCString() + "</strong>. You now have lifetime Premium access." : ""}</p>
            <p style="text-align:center;margin:24px 0">
                <a href="${APP_URL}/dashboard" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Go to dashboard</a>
            </p>`,
        ),
    });
}

export async function sendPaymentRejectedEmail(
    to: string,
    args: { submissionNumber: string; reason: string },
): Promise<void> {
    await safeSend({
        to,
        subject: `Payment Could Not Be Verified (${args.submissionNumber})`,
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Payment verification failed</h2>

<p style="color:#334155">Reason: ${escape(args.reason)}</p>
<p style="color:#334155">Please resubmit with correct details, or contact support if you need help.</p>,
    "#dc2626",
    }),
}

export async function sendSubscriptionExpiringSoonEmail(
    to: string,
    args: { daysRemaining: number; endDate: string },
): Promise<void> {
    await safeSend({
        to,
        subject: `Your Premium Expires in ${args.daysRemaining} Days`,
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Premium expiring soon</h2>
            <p style="color:#334155">Your Premium access ends on <strong>${new Date(args.endDate).toUTCString()}</strong>.</p>
            <p style="color:#334155">Renew now to keep unlimited access and ad-free study sessions.</p>
            <p style="text-align:center;margin:24px 0">
                <a href="${APP_URL}/pricing" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Renew Premium</a>
            </p>`,
            "#d97706",
        ),
    });
}

export async function sendSubscriptionExpiredEmail(to: string): Promise<void> {
    await safeSend({
        to,
        subject: "Your Premium Subscription Has Ended",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Premium expired</h2>
            <p style="color:#334155">Your account has been moved to the Free tier.</p>
            <p style="color:#334155">Renew any time to restore unlimited features and ad-free access.</p>
            <p style="text-align:center;margin:24px 0">
                <a href="${APP_URL}/pricing" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View plans</a>
            </p>`,
            "#475569",
        ),
    });
}

export async function sendAdminUpgradedAccountEmail(
    to: string,
    args: { adminName: string; planName: string; endDate: string | null },
): Promise<void> {
    await safeSend({
        to,
        subject: "You've Been Upgraded to Premium!",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">Premium granted by admin</h2>
            <p style="color:#334155">Upgraded by: <strong>${escape(args.adminName)}</strong></p>
            <p style="color:#334155">Plan: <strong>${escape(args.planName)}</strong></p>
            <p style="color:#334155">${args.endDate ? `Valid until <strong>${new Date(args.endDate).toUTCString()}</strong>.` : "This upgrade is lifetime."}</p>`,
            "#16a34a",
        ),
    });
}

export async function sendPangMeryendaPaymentConfirmedEmail(
    to: string,
    args: { transactionId: string; planName: string; endDate: string | null },
): Promise<void> {
    await safeSend({
        to,
        subject: "Payment Confirmed -- Premium Activated!",
        html: panel(
            `<h2 style="color:#0f172a;margin:0 0 12px">PangMeryenda payment confirmed</h2>
            <p style="color:#334155">Transaction: <strong>${escape(args.transactionId)}</strong></p>
            <p style="color:#334155">Plan: <strong>${escape(args.planName)}</strong></p>
            <p style="color:#334155">${args.endDate ? `Premium active until <strong>${new Date(args.endDate).toUTCString()}</strong>.` : "Premium is active with no expiry."}</p>`,
            "#16a34a",
        ),
    });
}