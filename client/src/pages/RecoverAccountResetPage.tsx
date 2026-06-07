/**
 * /recover-account/reset?token=... - final step of account recovery.
 *
 * Consumes a `recoveryToken` (15-min, scope: "recovery") obtained via the recovery-code or security-questions flow, lets the user pick a new password, and on success redirects to /login.
 */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { validatePassword } from "@upcat/shared";
import { recoveryApi } from "@/lib/accountApi";
import { useToastStore } from "@/stores/toastStore";
import Seo from "@/components/Seo";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";

export default function RecoverAccountResetPage() {
    const [params] = useParams();
    const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);
    const token = params.get("token") ?? "";
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);

    if (!token) {
        return (
            <div className="mx-auto max-w-md px-4 py-12 text-center">
                <Seo title="Recover account" noindex />
                <h1 className="text-xl font-bold text-gray-900">Invalid or expired link</h1>
                <p className="mt-2 text-sm text-gray-600">Please restart the recovery flow.</p>
                <Link to="/recover-account" className="btn-primary mt-4 inline-block">
                    Back to recovery
                </Link>
            </div>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (next !== confirm) return addToast("error", "Passwords do not match.");
        const check = validatePassword(next);
        if (!check.isValid)
            return addToast("error", check.errors[0] ?? "Password too weak.");
        setBusy(true);
        try {
            await recoveryApi.recoverAccount(token, {
                action: "reset_password",
                newPassword: next,
                confirmPassword: confirm,
            });
            addToast("success", "Password reset. Please sign in.");
            navigate("/login", { replace: true });
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string; }; }; }).response?.data?.error || "Could not reset your password. The recovery link may have expired.";
            addToast("error", msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-md px-4 py-12">
            <Seo title="Set a new password" noindex />
            <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
            <p className="mt-1 text-sm text-gray-500">Choose a strong, unique password. All existing sessions will be signed out.</p>

            <form onSubmit={submit} className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <label className="block text-sm">
                    <span className="font-medium text-gray-700">New password</span>
                    <input
                        type="password"
                        required
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        className="input-field mt-1"
                    />
                    {next && <PasswordStrengthBar password={next} />}
                </label>
                <label className="block text-sm">
                    <span className="font-medium text-gray-700">Confirm new password</span>
                    <input
                        type="password"
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="input-field mt-1"
                    />
                </label>
                <button type="submit" disabled={busy} className="btn-primary w-full">
                    {busy ? "Saving..." : "Set password"}
                </button>
            </form>
        </div>
    );
}