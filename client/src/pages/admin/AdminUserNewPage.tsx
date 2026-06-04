import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "@/lib/adminApi";
import { useToastStore } from "@/stores/toastStore";
import type { UserRole } from "@upcat/shared";

export default function AdminUserNewPage() {
    const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);
    const [busy, setBusy] = useState(false);

    return (
        <form
            className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={(async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setBusy(true);
                try {
                    await adminApi.createUser({
                        firstName: String(fd.get("firstName")),
                        lastName: String(fd.get("lastName")),
                        email: String(fd.get("email")),
                        role: fd.get("role") as UserRole,
                        sendInvite: !!fd.get("sendInvite"),
                    });
                    addToast("success", "User created.");
                    navigate("/admin/users");
                } catch (err) {
                    const msg = (err as { response?: { data?: { error?: string; }; } }).response?.data?.error;
                    addToast("error", msg ?? "Could not create user.");
                } finally {
                    setBusy(false);
                }
            })}
        >
            <h2 className="text-lg font-bold text-slate-900">Create user</h2>
            <p className="text-sm text-slate-500">A random password is generated. Toggle "Send invite" to email a reset link instead.</p>
            <div className="grid grid-cols-2 gap-3">
                <Field label="First name"><input name="firstName" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/></Field>
                <Field label="Last name"><input name="lastName" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/></Field>
                <Field label="Email"><input name="email" type="email" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/></Field>
                <Field label="Role">
                    <select name="role" defaultValue="reviewee" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                        <option value="reviewee">Reviewee</option>
                        <option value="admin">Admin</option>
                    </select>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                    <input name="sendInvite" type="checkbox" defaultChecked/> Email a password-reset invite
                </label>
                <div className="flex justify-between">
                    <Link to="/admin/users" className="text-sm text-slate-600 hover:underline">← Back</Link>
                    <button type="submit" disabled={busy}>
                        <button type="submit" disabled={busy} className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                            {busy ? "Creating..." : "Create user"}
                        </button>
                    </button>
                </div>
            </div>
        </form>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
            {children}
        </label>
    );
}