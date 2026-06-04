import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Spinner from "@/components/admin/Spinner";
import Badge from "@/components/admin/Badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { adminApi } from "@/lib/adminApi";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import type { UserRole } from "@upcat/shared";

interface UserDetail {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  notes?: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount?: number;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  examHistory?: Array<{
    _id: string;
    status: string;
    startedAt: string;
    completedAt?: string | null;
    percentage?: number | null;
    setName?: string | null
  }>;
  stats?: { totalExams: number; averageScore: number | null; bestScore: number | null };
  contactMessages?: Array<{ _id: string; subject: string; createdAt: string; status: string }>;
  subscription?: {
    tier?: "free" | "premium";
    premium?: {
      endDate?: string | null;
      isLifetime?: boolean;
    } | null;
  };
}

export default function AdminUserDetailPage() {
  const [id] = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const me = useAuthStore((s) => s.user);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "premium">("free");
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState<string>(defaultExpiryDateInput());
  const [confirm, setConfirm] = useState<null | "deactivate" | "reactivate" | "reset" | "verify">(null);

  const refresh = async () => {
    if (!id) return;
    try {
      const data = (await adminApi.getUser(id)) as unknown as UserDetail;
      setUser(data);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Could not load user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, [id]);

  useEffect(() => {
    if (!user) return;
    const tier = user.subscription?.tier === "premium" ? "premium" : "free";
    setSubscriptionTier(tier);
    setSubscriptionExpiryDate(
      toDateInputValue(user.subscription?.premium?.endDate) ?? defaultExpiryDateInput(),
    );
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Spinner/></div>;
  if (!user) return null;
  const isSelf = me?.id === user._id;
  const canEditSubscription = user.role !== "admin";

  const save = async (patch: Partial<UserDetail>) => {
    setSaving(true);
    try {
      await adminApi.updateUser(user._id, patch as Record<string, unknown>);
      addToast("success", "Saved.");
      refresh();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!confirm) return;
    try {
      if (confirm === "deactivate") {
        await adminApi.deactivateUser(user._id);
        addToast("success", "User deactivated.");
        refresh();
      } else if (confirm === "reactivate") {
        await adminApi.reactivateUser(user._id);
        addToast("success", "User reactivated.");
        refresh();
      } else if (confirm === "reset") {
        await adminApi.resetUser(user._id);
        addToast("success", "User reset.");
        refresh();
      } else if (confirm === "verify") {
        await adminApi.verifyUser(user._id);
        addToast("success", "User verified.");
        refresh();
      }
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Failed to perform action.");
    }
  };
}
if (confirm === "deactivate") await adminApi.deactivateUser(user.id);
if (confirm === "reactivate") await adminApi.reactivateUser(user.id);
if (confirm === "reset") await adminApi.resetUserPassword(user.id);
if (confirm === "verify") await adminApi.verifyUserEmail(user.id);
addToast("success", "Done.");
setConfirm(null);
refresh();
} catch (e) {
    const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
    addToast("error", msg ?? "Action failed.");
    setConfirm(null);
}
};

const saveSubscription = async () => {
    if (!canEditSubscription) {
        addToast("error", "Subscription controls are only available for non-admin accounts.");
        return;
    }
    setSavingSubscription(true);
    try {
        if (subscriptionTier === "free") {
            await adminApi.setUserFree(user.id, {
                immediate: true,
                reason: "Admin changed reviewee subscription status to free",
            });
        } else {
            const periodDays = daysUntilExpiry(subscriptionExpiryDate);
            if (!Number.isFinite(periodDays) || periodDays <= 0) {
                addToast("error", "Expiry date must be in the future.");
                setSavingSubscription(false);
                return;
            }
            await adminApi.setUserPremium(user.id, {
                periodDays: Math.floor(periodDays),
                reason: "Admin changed reviewee subscription expiry date",
            });
        }
        addToast("success", "Subscription updated.");
        await refresh();
    } catch (e) {
        const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
        addToast("error", msg ?? "Subscription update failed.");
    } finally {
        setSavingSubscription(false);
    }
};

return (
    <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{user.firstName} {user.lastName}</h2>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={user.role === "admin" ? "violet" : "neutral"}>{user.role}</Badge>
                        <Badge variant={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Deactivated"}</Badge>
                        <Badge variant={user.isVerified ? "success" : "warning"}>{user.isVerified ? "Verified" : "Unverified"}</Badge>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {user.isActive ? (
                        <button type="button" disabled={isSelf} onClick={() => setConfirm("deactivate")}>
                            <div className="rounded-md border border-primary-300 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-40">
                                Deactivate
                            </div>
                        </button>
                    ) : (
                        <button type="button" onClick={() => setConfirm("reactivate")}>
                            <div className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                                Reactivate
                            </div>
                        </button>
                    )}
                    {!user.isVerified && (
                        <button type="button" onClick={() => setConfirm("verify")}>
                            <div className="rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
                                Verify email
                            </div>
                        </button>
                    )}
                    <button type="button" onClick={() => setConfirm("reset")}>
                        <div className="rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
                            Send reset link
                        </div>
                    </button>
                    <Link to="/admin/users">
                        <div className="rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">
                            Back
                        </div>
                    </Link>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    save({
                        firstName: String(fd.get("firstName")),
                        lastName: String(fd.get("lastName")),
                        role: fd.get("role") as UserRole,
                        notes: String(fd.get("notes") ?? ""),
                    });
                }}>
<div className="grid grid-cols-2 gap-3">
    <Field label="First name"><input name="firstName" defaultValue={user.firstName} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/></Field>
    <Field label="Last name"><input name="lastName" defaultValue={user.lastName} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/></Field>
    <Field label="Role">
        <select name="role" defaultValue={user.role} disabled={isSelf} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100">
            <option value="reviewee">Reviewee</option>
            <option value="admin">Admin</option>
        </select>
        {isSelf && <p className="mt-1 text-xs text-amber-700">You cannot change your own role.</p>}
    </Field>
    <Field label="Joined">
        <input disabled value={new Date(user.createdDt).toLocaleString()} className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"/>
    </Field>
    <Field label="Internal notes">
        <textarea name="notes" defaultValue={user.notes ?? ""} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/>
    </Field>
    <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save changes"}
        </button>
    </div>
</form>
<aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-sm font-bold text-slate-700">Stats</h3>
    <p className="text-sm">Total exams: <strong>{user.stats?.totalExams ?? 0}</strong></p>
    <p className="text-sm">Average score: <strong>{user.stats?.averageScore?.toFixed(1) ?? "-"}</strong></p>
    <p className="text-sm">Best score: <strong>{user.stats?.bestScore?.toFixed(1) ?? "-"}</strong></p>
    <hr className="border-slate-200"/>
    <p className="text-xs text-slate-500">Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</p>
    <p className="text-xs text-slate-500">Login count: {user.loginCount ?? 0}</p>
</aside>
<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-700">Reviewee subscription</h3>
        {!canEditSubscription && <span className="text-xs text-amber-700">Admin subscriptions cannot be updated here.</span>}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Status">
            <select value={subscriptionTier} onChange={(e) => {
                const nextTier = e.target.value as "free" | "premium";
                setSubscriptionTier(nextTier);
                if (nextTier === "premium" && !subscriptionExpiryDate) {
                    setSubscriptionExpiryDate(defaultExpiryDateInput());
                }
            }} disabled={!canEditSubscription || savingSubscription} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100">
                <option value="free">Free</option>
                <option value="premium">Premium</option>
            </select>
        </Field>
        {subscriptionTier === "premium" && (
            <Field label="Expiry date">
                <input type="date" value={subscriptionExpiryDate} onChange={(e) => setSubscriptionExpiryDate(e.target.value)} min={todayDateInput()} disabled={!canEditSubscription || savingSubscription} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"/>
            </Field>
        )}
        <div className="flex items-end">
            <button type="button" onClick={saveSubscription} disabled={!canEditSubscription || savingSubscription} className="w-full rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                {savingSubscription ? "Updating..." : "Update subscription"}
            </button>
        </div>
    </div>
</section>
<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="mb-3 text-sm font-bold text-slate-700">Recent exams</h3>
    {user.examHistory || user.examHistory.length === 0 ? (
        <p className="text-sm text-slate-400">No exams.</p>
    ) : (
        <ul className="divide-y divide-slate-100 text-sm">
            {user.examHistory.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between py-2">
                    <span className="min-w-0">
function Field({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
            {children}
        </label>
    );
}