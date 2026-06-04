import { useEffect, useState } from "react";
import { API_ROUTES } from "@upcat/shared";
import apiClient from "@/lib/api";
import Modal from "@/components/Modal";
import { useToastStore } from "@/stores/toastStore";

interface Plan {
    id: string;
    name: string;
    price: number;
    duration: number;
    isLifetime: boolean;
    isActive: boolean;
    description: string;
    originalPrice: number | null;
    features: string[];
    order: number;
}

interface ManualChannel {
    id: string;
    name: string;
    type: "ewallet" | "bank";
    enabled: boolean;
    accountName: string;
    accountNumber: string;
    bankName: string | null;
    additionalNotes: string | null;
    order: number;
}

interface ManualConfig {
    processingTimeMessage: string;
    instructionsHeader: string;
    instructionsBody: string;
    autoDisableThreshold: number;
    channels: ManualChannel[];
}

interface PangMeryendaConfig {
    enabled: boolean;
    apiBaseUrl: string;
    apiKey: string | null;
    apiSecretEnc: string | null;
    webhookSecret: string | null;
    merchantId: string | null;
    successRedirectUrl: string;
    failureRedirectUrl: string;
    cancelRedirectUrl: string;
}

interface FormState {
    id: string;
    name: string;
    price: number;
    duration: number;
    isLifetime: boolean;
    isActive: boolean;
    description: string;
    originalPrice: number | null;
    features: string;
    order: number;
}

const emptyForm: FormState = {
    id: "",
    name: "",
    price: 0,
    duration: 30,
    isLifetime: false,
    isActive: true,
    description: "",
    originalPrice: null,
    features: "",
    order: 0,
};

export default function AdminPaymentConfigPage() {
    const [loading, setLoading] = useState(true);
    const [activePaymentType, setActivePaymentType] = useState<"free" | "manual" | "pangmeryenda">("manual");
    const [plans, setPlans] = useState<Plan[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [adminPassword, setAdminPassword] = useState("");
    const [updatingMode, setUpdatingMode] = useState(false);
    const [manualConfig, setManualConfig] = useState<ManualConfig | null>(null);
    const [savingManual, setSavingManual] = useState(false);
    const [pangConfig, setPangConfig] = useState<PangMeryendaConfig | null>(null);
    const [savingPang, setSavingPang] = useState(false);
    const [testingPang, setTestingPang] = useState(false);
    const [pangApiSecret, setPangApiSecret] = useState("");
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [savingPlan, setSavingPlan] = useState(false);
    const addToast = useToastStore((s) => s.addToast);
    const subscriptionEnabled = activePaymentType !== "free";

    const load = async () => {
        const { data } = await apiClient.get<{
            activePaymentType: "free" | "manual" | "pangmeryenda";
            plans: Plan[];
            manual: ManualConfig;
            pangmeryenda: PangMeryendaConfig;
});
>(API_ROUTES.ADMIN.PAYMENT_CONFIG);
setActivePaymentType(data.data.activePaymentType);
setPlans(data.data.plans || []);
setManualConfig(data.data.manual ?? null);
setPangConfig(data.data.pangmeryenda ?? null);

};

useEffect(() => {
load()
.catch(() => setMessage("Could not load payment configuration."))
.finally(() => setLoading(false));
}, []);

const openAddPlanModal = () => {
setEditingPlan(null);
setForm({...emptyForm, order: (plans.length || 0) + 1});
setShowPlanModal(true);
};

const openEditPlanModal = (plan: Plan) => {
setEditingPlan(plan);
setForm({
...plan,
features: plan.features.join(","),
});
setShowPlanModal(true);
};

const closePlanModal = () => {
setShowPlanModal(false);
setForm(emptyForm);
};

const savePlan = async (e: React.FormEvent) => {
e.preventDefault();
if (!form.id.trim() || !form.name.trim()) {
addToast("error", "Plan ID and name are required.");
return;
}
if (form.price < 0) {
addToast("error", "Price cannot be negative.");
return;
}
if (!form.isLifetime && form.duration <= 0) {
addToast("error", "Duration must be greater than 0 for non-lifetime plans.");
return;
}

setSavingPlan(true);
try {
const updatedPlans = editingPlan
? plans.map((p) => (p.id === editingPlan.id ? {
...p,
features: form.features.split(",").map((f) => f.trim())
} : p))
: [...plans, {...form, features: form.features.split(",").map((f) => f.trim())}];
await apiClient.put(API_ROUTES.ADMIN.PAYMENT_CONFIG_PLANS, {plans: updatedPlans});
setPlans(updatedPlans);
addToast("success", editingPlan ? "Plan updated." : "Plan added.");
closePlanModal();
} catch (err) {
const apiMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
addToast("error", apiMsg || "Failed to save plan.");
} finally {
setSavingPlan(false);
}
};

const deletePlan = async (planId: string) => {
if (!confirm("Delete this plan?")) return;
try {
const updatedPlans = plans.filter((p) => p.id !== planId);
if (updatedPlans.length === 0 || !updatedPlans.some((p) => p.isActive)) {
addToast("error", "At least one active plan must remain.");
return;
}
await apiClient.put(API_ROUTES.ADMIN.PAYMENT_CONFIG_PLANS, {plans: updatedPlans});
setPlans(updatedPlans);
addToast("success", "Plan deleted.");
} catch (err) {
const apiMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
addToast("error", apiMsg || "Failed to delete plan.");
}
};

const updatePaymentType = async (nextType: "free" | "manual" | "pangmeryenda") => {
setUpdatingMode(true);
setMessage(null);
try {
await apiClient.put(API_ROUTES.ADMIN.PAYMENT_CONFIG_TYPE, {
activePaymentType: nextType,
adminPassword: adminPassword.trim(),
});
setActivePaymentType(nextType);
setAdminPassword("");
setMessage(
nextType === "free"
? "Subscription is now disabled."
: `Subscription is enabled with ${nextType} payment mode.`,
);
} catch (err) {
const apiMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
const updateManualChannel = (channelId: string, patch: Partial<ManualChannel>) => {
    setManualConfig((prev) => {
        if (!prev) return prev;
        return {
            ...prev,
            channels: prev.channels.map((channel) =>
                channel.id === channelId ? {...channel, ...patch} : channel,
            ),
        };
    });
};

const saveManualConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualConfig) return;

    setSavingManual(true);
    try {
        const payload = {
            processingTimeMessage: manualConfig.processingTimeMessage,
            instructionsHeader: manualConfig.instructionsHeader,
            instructionsBody: manualConfig.instructionsBody,
            autoDisableThreshold: Number(manualConfig.autoDisableThreshold) || 0,
            channels: manualConfig.channels,
        };
        const {data} = await apiClient.put<ManualConfig>({
            API_ROUTES.ADMIN.PAYMENT_CONFIG_MANUAL,
            payload,
        });
        setManualConfig(data.data);
        addToast("success", "Manual payment details updated.");
    } catch (err) {
        const apiMsg = (err as { response?: { data?: { error?: string } }; }).response?.data?.error;
        addToast("error", apiMsg || "Failed to save manual payment details.");
    } finally {
        setSavingManual(false);
    }
};

const savePangConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pangConfig) return;

    setSavingPang(true);
    try {
        const payload = {
            apiBaseUrl: pangConfig.apiBaseUrl,
            apiKey: pangConfig.apiKey,
            apiSecret: pangApiSecret.trim() || undefined,
            webhookSecret: pangConfig.webhookSecret,
            merchantId: pangConfig.merchantId,
            successRedirectUrl: pangConfig.successRedirectUrl,
            failureRedirectUrl: pangConfig.failureRedirectUrl,
            cancelRedirectUrl: pangConfig.cancelRedirectUrl,
        };
        const {data} = await apiClient.put<PangMeryendaConfig>({
            API_ROUTES.ADMIN.PAYMENT_CONFIG_PANGMERYENDA,
            payload,
        });
        setPangConfig(data.data);
        setPangApiSecret("");
        addToast("success", "PangMeryenda settings updated.");
    } catch (err) {
        const apiMsg = (err as { response?: { data?: { error?: string } }; }).response?.data?.error;
        addToast("error", apiMsg || "Failed to save PangMeryenda settings.");
    } finally {
        setSavingPang(false);
    }
};

const testPangConnection = async () => {
    setTestingPang(true);
    try {
        const {data} = await apiClient.post<{ connected: boolean; error?: string }>({
            API_ROUTES.ADMIN.PAYMENT_CONFIG_PANGMERYENDA_TEST,
        });
        if (data.data.connected) {
            addToast("success", "PangMeryenda connection is healthy.");
        } else {
            addToast("warning", data.data.error || "PangMeryenda credentials are incomplete.");
        }
    } catch (err) {
        const apiMsg = (err as { response?: { data?: { error?: string } }; }).response?.data?.error;
        addToast("error", apiMsg || "Failed to test PangMeryenda connection.");
    } finally {
        setTestingPang(false);
    }
};

if (loading) {
    return <p className="text-sm text-slate-500">Loading payment config...</p>;
}

return (
    <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Subscription Configuration</h2>
            <p className="mt-1 text-sm text-slate-600">
<p>Enable subscription to enforce feature limits and premium unlocks. Disable subscription to remove feature restrictions.</p>
<label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="admin-password-confirm">
  Confirm admin password
</label>
<input id="admin-password-confirm" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter your password to change payment mode" className="mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm" autoComplete="current-password" />
<div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
  <div>
    <p className="text-sm font-semibold text-slate-900">Subscription</p>
    <p className="text-xs text-slate-600">{subscriptionEnabled ? "Enabled: feature limits apply to non-premium users." : "Disabled: feature limits are bypassed for all users."}</p>
  </div>
  <button type="button" role="switch" aria-checked={subscriptionEnabled} disabled={updatingMode || !adminPassword.trim()} onClick={() => {
    const nextType = subscriptionEnabled ? "free" : "manual";
    void updatePaymentType(nextType);
  }} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${subscriptionEnabled ? "bg-primary-600" : "bg-slate-300"} disabled:cursor-not-allowed disabled:opacity-60`}>
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${subscriptionEnabled ? "translate-x-6" : "translate-x-1"}`}</span>
  </button>
</div>
{!subscriptionEnabled && (
  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    Subscription is disabled. Payment mode and subscription plan settings are hidden.
  </div>
)}
</section>
{activePaymentType === "manual" && manualConfig && (
  <section className="order-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">Manual Payment Details</h2>
    <p className="mt-1 text-sm text-slate-600">Configure GCash, Maya, and bank account information shown on the checkout page.</p>
    <form onSubmit={saveManualConfig} className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Processing message</span>
          <input type="text" value={manualConfig.processingTimeMessage} onChange={(e) => setManualConfig((prev) => prev ? {...prev, processingTimeMessage: e.target.value} : prev)} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Auto-disable threshold</span>
          <input type="number" min="0" value={manualConfig.autoDisableThreshold} onChange={(e) => setManualConfig((prev) => prev ? {...prev, autoDisableThreshold: Number(e.target.value) || 0} : prev)} />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Instructions header</span>
          <input type="text" value={manualConfig.instructionsHeader} onChange={(e) => setManualConfig((prev) => prev ? {...prev, instructionsHeader: e.target.value} : prev)} />
        </label>
      </div>
    </form>
  </section>
)}
}
    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
  />
</label>

  <label className="block md:col-span-1">
    <span className="text-xs font-semibold text-slate-700">Instructions body</span>
    <textarea
      value={manualConfig.instructionsBody}
      onChange={(e) => setManualConfig((prev) => prev ? { ...prev, instructionsBody: e.target.value } : prev)}
      rows={3}
      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
    />
  </label>
</div>

<div className="space-y-3 rounded-md border border-slate-200 p-3">
  <p className="text-sm font-semibold text-slate-800">Channels</p>
  {manualConfig.channels
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(({ channel }) => (
      <div key={channel.id} className="rounded-md border border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">{channel.name} <span className="text-slate-500">{channel.id}</span></p>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={channel.enabled}
              onChange={(e) => updateManualChannel(channel.id, { enabled: e.target.checked })}
              className="rounded border-slate-300"
            />
            Enabled
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Account name</span>
            <input
              type="text"
              value={channel.accountName}
              onChange={(e) => updateManualChannel(channel.id, { accountName: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">{channel.type === "bank" ? "Account number" : "Mobile number"}</span>
            <input
              type="text"
              value={channel.accountNumber}
              onChange={(e) => updateManualChannel(channel.id, { accountNumber: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {channel.type === "bank" && (
          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-700">Bank name</span>
            <input
              type="text"
              value={channel.bankName ?? ""}
              onChange={(e) => updateManualChannel(channel.id, { bankName: e.target.value.trim() ? e.target.value : null })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        )}

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-slate-700">Additional notes</span>
          <textarea
            value={channel.additionalNotes ?? ""}
            onChange={(e) => updateManualChannel(channel.id, { additionalNotes: e.target.value.trim() ? e.target.value : null })}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
    ))}
</div>
<div className="flex justify-end">
  <button type="submit" disabled={savingManual} className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
    {savingManual ? "Saving..." : "Save manual payment details"}
  </button>
</div>
</form>
</section>

{activePaymentType === "pangmeryenda" && pangConfig && (
  <section className="order-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">PangMeryenda Settings</h2>
    <p className="mt-1 text-sm text-slate-600">
      Configure API credentials and redirect URLs used for PangMeryenda checkout.
    </p>

    <form onSubmit={savePangConfig} className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">API base URL</span>
          <input
            type="text"
            value={pangConfig.apiBaseUrl}
            onChange={(e) => setPangConfig((prev) => (prev ? { ...prev, apiBaseUrl: e.target.value } : prev))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Merchant ID</span>
          <input
            type="text"
            value={pangConfig.merchantId ?? ""}
            onChange={(e) => setPangConfig((prev) => (prev ? { ...prev, merchantId: e.target.value.trim() ? e.target.value : null } : prev))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">API key</span>
            <input
              type="password"
              value={pangConfig.apiKey ?? ""}
              onChange={(e) => setPangConfig((prev) => (prev ? { ...prev, apiKey: e.target.value.trim() ? e.target.value : null } : prev))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Enter API key"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">API secret (leave blank to keep current)</span>
            <input
              type="password"
              value={pangApiSecret}
              onChange={(e) => setPangApiSecret(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Enter new API secret"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Webhook secret</span>
            <input
              type="text"
              value={pangConfig.webhookSecret ?? ""}
              onChange={(e) => setPangConfig((prev) => (prev ? { ...prev, webhookSecret: e.target.value.trim() ? e.target.value : null } : prev))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Success redirect URL</span>
<input
  type="text"
  value={pangConfig.successRedirectUrl}
  onChange={(e) =>
    setPangConfig((prev) =>
      prev ? { ...prev, successRedirectUrl: e.target.value } : prev,
    )
  }
  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
/>
<label className="block">
  <span className="text-xs font-semibold text-slate-700">Failure redirect URL</span>
  <input
    type="text"
    value={pangConfig.failureRedirectUrl}
    onChange={(e) =>
      setPangConfig((prev) =>
        prev ? { ...prev, failureRedirectUrl: e.target.value } : prev,
      )
    }
    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
  />
</label>
<label className="block">
  <span className="text-xs font-semibold text-slate-700">Cancel redirect URL</span>
  <input
    type="text"
    value={pangConfig.cancelRedirectUrl}
    onChange={(e) =>
      setPangConfig((prev) =>
        prev ? { ...prev, cancelRedirectUrl: e.target.value } : prev,
      )
    }
    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
  />
</label>
<div className="flex justify-end gap-2">
  <button
    type="button"
    onClick={testPangConnection}
    disabled={testingPang}
    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
  >
    {testingPang ? "Testing..." : "Test connection"}
  </button>
  <button
    type="submit"
    disabled={savingPang}
    className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
  >
    {savingPang ? "Saving..." : "Save PangMeryenda settings"}
  </button>
</div>
{subscriptionEnabled && (
  <section className="order-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">Subscription Plans</h2>
      <button
        type="button"
        onClick={openAddPlanModal}
        className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
      >
        Add plan
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2 text-right">Status</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{p.id}</td>
              <td className="px-3 py-2 font-medium text-slate-900">{p.name}</td>
              <td className="px-3 py-2 text-slate-700">₱{p.price.toLocaleString()}</td>
              <td className="px-3 py-2 text-slate-700">{p.isLifetime ? "Lifetime" : `${p.duration} days`}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                >
                  {p.isActive ? "active" : "inactive"}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => openEditPlanModal(p)}
                  className="mr-2 text-xs text-primary-600 hover:underline"
                >
                  Edit
type="button"
onClick={() => deletePlan(p.id)}
className="text-xs.text-rose-600.hover:underline"
>
Delete
</button>
</td>
))}
</tr>
</tbody>
</table>
</div>
</section>

{subscriptionEnabled && (
<section className="order-3.rounded-xl.border.border-slate-200.bg-white.p-5.shadow-sm">
<h2 className="text-lg.font-semibold.text-slate-900">Payment Mode Configuration</h2>
<p className="mt-1.text-sm.text-slate-600">
Choose how paid subscription checkout is handled.
</p>
<div className="mt-4.flex.flex-wrap.gap-2">
{(["manual", "pangmeryenda"] as const).map((mode) => (
<button
key={mode}
type="button"
disabled={(updatingMode || (activePaymentType !== mode && !adminPassword.trim()))
className={`rounded-md.border.px-3.py-2.text-sm.font-semibold ${activePaymentType === mode ? "border-primary-600.bg-primary-50.text-primary-700" : "border-slate-300.text-slate-700"} disabled:cursor-not-allowed.disabled:opacity-60`}
onClick={() => {
if (mode === activePaymentType) return;
void updatePaymentType(mode);
}}
>
{mode === "pangmeryenda" ? "PangMeryenda" : "Manual payment"}
</button>
))}
</div>
</section>

{message && <p className="rounded-md.bg-blue-50.p-3.text-sm.text-blue-800">{message}</p>

<Modal isOpen={showPlanModal} onClose={closePlanModal} title={editingPlan ? "Edit plan" : "Add plan"} size="lg">
<form onSubmit={savePlan} className="space-y-4">
<div className="grid.grid-cols-2.gap-3">
<label className="block">
<span className="text-xs.font-semibold.text-slate-700">Plan ID</span>
<input
type="text"
value={form.id}
onChange={(e) => setForm({ ...form, id: e.target.value })}
disabled={!editingPlan}
className="mt-1.w-full.rounded-md.border.border-slate-300.px-2.py-1.5.text-sm.disabled:bg-slate-50"
placeholder="e.g., 30_days"
required
/>
</label>
<label className="block">
<span className="text-xs.font-semibold.text-slate-700">Name</span>
<input
type="text"
value={form.name}
onChange={(e) => setForm({ ...form, name: e.target.value })}
className="mt-1.w-full.rounded-md.border.border-slate-300.px-2.py-1.5.text-sm"
placeholder="e.g., 1 Month Premium"
required
/>
</label>
<div className="grid.grid-cols-2.gap-3">
<label className="block">
<span className="text-xs.font-semibold.text-slate-700">Price (₱)</span>
<input
type="number"
min="0"
step="1"
value={form.price}
onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
className="mt-1.w-full.rounded-md.border.border-slate-300.px-2.py-1.5.text-sm"
required
/>
</label>
<label className="block">
<span className="text-xs.font-semibold.text-slate-700">Original price (optional)</span>
<input
type="number"
min="0"
step="1"
value={form.originalPrice || ""}
onChange={(e) => setForm({
...form,
originalPrice: e.target.value ? Number(e.target.value) : null
})}
className="mt-1.w-full.rounded-md.border.border-slate-300.px-2.py-1.5.text-sm"
placeholder="For display as strikethrough"
/>
</label>
</div>
</form>
</Modal>
<div className="grid grid-cols-2 gap-3">
    <label className="block">
        <span className="text-xs font-semibold text-slate-700">Duration (days)</span>
        <input
            type="number"
            min="1"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            disabled={form.isLifetime}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
            required
        />
    </label>
    <label className="flex items-end gap-2 pb-1.5">
        <input
            type="checkbox"
            checked={form.isLifetime}
            onChange={(e) => setForm({ ...form, isLifetime: e.target.checked })}
            className="rounded border-slate-300"
        />
        <span className="text-xs font-semibold text-slate-700">Lifetime plan</span>
    </label>
</div>

<label className="block">
    <span className="text-xs font-semibold text-slate-700">Description</span>
    <input
        type="text"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        placeholder="Brief plan description"
    />
</label>

<label className="block">
    <span className="text-xs font-semibold text-slate-700">Features (comma-separated)</span>
    <textarea
        value={form.features}
        onChange={(e) => setForm({ ...form, features: e.target.value })}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        rows={2}
        placeholder="e.g., Unlimited exams, No ads, Priority support"
    />
</label>

<div className="grid grid-cols-2 gap-3">
    <label className="block">
        <span className="text-xs font-semibold text-slate-700">Display order</span>
        <input
            type="number"
            min="1"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
    </label>
    <label className="flex items-end gap-2 pb-1.5">
        <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-slate-300"
        />
        <span className="text-xs font-semibold text-slate-700">Active</span>
    </label>
</div>

<div className="flex justify-end gap-2 pt-4">
    <button type="button" onClick={closePlanModal}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
        Cancel
    </button>
    <button type="submit" disabled={savingPlan}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
        {savingPlan ? "Saving..." : "Save plan"}
    </button>
</div>
</form>
</Modal>
</div>
});