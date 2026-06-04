/**
 * /admin/support/merge -- guided wizard for merging two accounts.
 *
 * Steps:
 * 1. Look up & confirm primary (keeper) user.
 * 2. Look up & confirm secondary (to be removed) user.
 * 3. Pick merge strategy.
 * 4. Admin password re-auth.
 * 5. Confirm + execute.
 * 6. Summary.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AccountMergeStrategy, MergeAccountsResponse, User } from "@upcat/shared";
import apiClient from "@/lib/api";
import { adminSupportApi } from "@/lib/supportApi";
import { useToastStore } from "@/stores/toastStore";
import Seo from "@/components/Seo";

interface AdminUserLite extends Pick<User, "_id" | "email" | "firstName" | "lastName" | "role"> {
    createdAt?: string;
}

async function lookupUser(idOrEmail: string): Promise<AdminUserLite | null> {
    try {
        const trimmed = idOrEmail.trim();
        // If it looks like an ObjectId, hit detail; otherwise list with search.
        if (/^[0-9a-f]{24}$/i.test(trimmed)) {
            const r = await apiClient.get(`/admin/users/${trimmed}`);
            return r.data.data as AdminUserLite;
        }
        const r = await apiClient.get(`/admin/users`, {
            params: { search: trimmed, limit: 1 },
        });
        const list = (r.data.data?.users ?? []) as AdminUserLite[];
        return list[0] ?? null;
    } catch {
        return null;
    }
}

export default function AdminMergeWizardPage() {
    const [params] = useSearchParams();
    const addToast = useToastStore((s) => s.addToast);

    const [step, setStep] = useState(1);
    const [primaryQuery, setPrimaryQuery] = useState(params.get("primary") ?? "");
    const [secondaryQuery, setSecondaryQuery] = useState("");
    const [primary, setPrimary] = useState<AdminUserLite | null>(null);
    const [secondary, setSecondary] = useState<AdminUserLite | null>(null);
    const [strategy, setStrategy] = useState<AccountMergeStrategy>("keep_primary_data");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<MergeAccountsResponse | null>(null);

    // Optionally auto-resolve primary from URL.
    useEffect(() => {
        if (primaryQuery && !primary) {
            void lookupUser(primaryQuery).then(setPrimary);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const findPrimary = async () => {
        const u = await lookupUser(primaryQuery);
        if (!u) return addToast("error", "Primary user not found.");
        setPrimary(u);
        setStep(2);
    };
    const findSecondary = async () => {
        const u = await lookupUser(secondaryQuery);
        if (!u) return addToast("error", "Secondary user not found.");
        if (primary && u._id === primary._id) {
            return addToast("error", "Cannot merge a user into itself.");
        }
        setSecondary(u);
        setStep(3);
    };

    const execute = async () => {
        if (!primary || !secondary) return;
        setBusy(true);
        try {
            const r = await adminSupportApi.mergeAccounts({
                primaryUserId: primary._id,
                secondaryUserId: secondary._id,
                mergeStrategy: strategy,
                adminPassword: password,
            });
            setResult(r);
            setStep(6);
        } catch (err) {
            const msg =
                (err as { response?: { data?: { error?: string; }; } }).response?.data?.error ||
                "Merge failed.";
            addToast("error", msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-6">
            <Seo title="Merge accounts" noindex />
<h1 className="text-2xl font-bold text-gray-900">Merge accounts</h1>
<ol className="flex flex-wrap gap-2 text-xs">
  {["Primary", "Secondary", "Strategy", "Re-auth", "Confirm", "Done"].map(
    (label, i) => (
      <li key={label} className={`rounded-full px-3 py-1 font-semibold ${step === i + 1 ? "bg-primary-600 text-white" : step > i + 1 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
        <span>{i + 1}. {label}</span>
      </li>
    )
  )}
</ol>

{step === 1 && (
  <Card title="1. Primary (keeper) user">
    <p className="text-xs text-gray-500">The account that will survive. All identities, sessions and contact messages will be transferred into this account.</p>
    <input placeholder="User ID or email" value={primaryQuery} onChange={(e) => setPrimaryQuery(e.target.value)} className="input-field" />
    <button onClick={findPrimary} disabled={!primaryQuery} className="btn-primary">Look up</button>
  </Card>
)}

{step === 2 && primary && (
  <>
    <UserSummary label="Primary (keeper)" u={primary} />
    <Card title="2. Secondary (to be removed) user">
      <p className="text-xs text-gray-500">This account will be soft-deleted after data transfer.</p>
      <input placeholder="User ID or email" value={secondaryQuery} onChange={(e) => setSecondaryQuery(e.target.value)} className="input-field" />
      <div className="flex gap-2">
        <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
        <button onClick={findSecondary} disabled={!secondaryQuery} className="btn-primary">Look up</button>
      </div>
    </Card>
  </>
)}

{step === 3 && primary && secondary && (
  <>
    <UserSummary label="Primary (keeper)" u={primary} />
    <UserSummary label="Secondary (removed)" u={secondary} tone="danger" />
    <Card title="3. Merge strategy">
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" checked={strategy === "keep_primary_data"} onChange={() => setStrategy("keep_primary_data")} />
        <span><strong>Keep primary data</strong> - transfer identities & contacts only. Secondary's exam sessions are discarded.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" checked={strategy === "merge_all"} onChange={() => setStrategy("merge_all")} />
        <span><strong>Merge all</strong> - also transfer secondary's exam sessions to primary.</span>
      </label>
      <div className="flex gap-2">
        <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
        <button onClick={() => setStep(4)} className="btn-primary">Continue</button>
      </div>
    </Card>
  </>
)
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </section>
  );
}

function UserSummary({
  label,
  u,
  tone = "default",
}: {
  label: string;
  u: AdminUserLite;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={`rounded-xl border p-3 text-sm ${u.tone === "danger"
        ? "border-red-200 bg-red-50"
        : "border-emerald-200 bg-emerald-50"}
<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
    {label}
</p>
<p className="font-semibold text-gray-900">
    {u.firstName} {u.lastName}
</p>
<p className="text-xs text-gray-600">
    {u.email} · role={u.role} · id={u._id}
</p>
</section>;
}