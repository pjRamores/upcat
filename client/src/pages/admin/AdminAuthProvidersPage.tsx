/**
 * /admin/auth-providers
 *
 * Admin UI for the auth_provider_settings document. Lists each provider with
 * its enabled state, redirect URI, scopes, linked-user count, and recent
 * login count. Editing opens a side panel; secrets are write-only.
 */
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import apiClient from "@/lib/api";
import {
  type AdminAuthProviderConfig,
  type AdminAuthProviders,
  API_ROUTES,
  SOCIAL_PROVIDER_META,
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from "@/upcat/shared";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";
import Badge from "@/components/admin/Badge";
import StatCard from "@/components/admin/StatCard";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToastStore } from "@/stores/toastStore";

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

const adminAuthApi = {
  list: () => unwrap<AdminAuthProviders>(apiClient.get(API_ROUTES.ADMIN.AUTH_PROVIDERS)),
  publish: () => {
    return unwrap({
      exported: boolean;
      contentSize: number;
      payload: Record<string, unknown>;
    })(apiClient.post("/admin/auth/providers/publish")),
    update: (provider: SocialProvider, body: Partial<AdminAuthProviderConfig> & { clientSecret?: string }) => {
      return unwrap<AdminAuthProviderConfig>(apiClient.put(API_ROUTES.ADMIN.AUTH_PROVIDER(provider), body),
    },
    test: (provider: SocialProvider) => {
      return unwrap<{ ok: boolean; warnings: string[] }>(apiClient.post(API_ROUTES.ADMIN.AUTH_PROVIDER_TEST(provider)),
    },
  };
};

export default function AdminAuthProvidersPage() {
  const [providers, setProviders] = useState<AdminAuthProviders | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SocialProvider | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<SocialProvider | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const reload = async () => {
    setLoading(true);
    try {
      setProviders(await adminAuthApi.list());
    } catch {
      addToast("error", "Could not load auth providers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const totalLinked = providers
    ? Object.values(providers).reduce((s, p) => s + p.linkedUsers, 0)
    : 0;
  const totalLogins = providers
    ? Object.values(providers).reduce((s, p) => s + p.logins7d, 0)
    : 0;
  const enabledCount = providers
    ? (SOCIAL_PROVIDERS as readonly SocialProvider[]).filter((p) => providers[p].enabled).length
    : 0;

  const toggleEnabled = async (provider: SocialProvider, next: boolean) => {
    try {
      await adminAuthApi.update(provider, { enabled: next });
      addToast("success", `${SOCIAL_PROVIDER_META[provider].label} ${next ? "enabled" : "disabled"}.`);
      await reload();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Update failed.";
      addToast("error", msg);
    }
  };

  const runTest = async (provider: SocialProvider) => {
    try {
      const r = await adminAuthApi.test(provider);
      if (r.ok) addToast("success", `${provider}: configuration looks good.`);
      else addToast("warning", `${provider}: ${r.warnings.join(" • ")}`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
  aria-hidden
    > <span className="font-semibold text-slate-900">{SOCIAL_PROVIDER_META[p].label}</span>
  </div>
  </td>
  <td className="px-4 py-3">
    {cfg.enabled ? (
      <Badge variant="success">Enabled</Badge>
    ) : (
      <Badge variant="neutral">Disabled</Badge>
    )}
  </td>
  <td className="max-w-[14rem] truncate px-4 py-3 text-xs text-slate-600">
    {cfg.clientId || <span className="text-slate-400">not set</span>}
  </td>
  <td className="max-w-[14rem] truncate px-4 py-3 text-xs text-slate-600">
    {cfg.redirectUri || <span className="text-slate-400">not set</span>}
  </td>
  <td className="px-4 py-3 text-xs text-slate-600">{cfg.scopes.join(" ")}</td>
  <td className="px-4 py-3 text-xs">{cfg.linkedUsers}</td>
  <td className="px-4 py-3 text-xs">{cfg.logins7d}</td>
  <td className="px-4 py-3 text-right">
    <div className="flex items-center justify-end gap-2">
      <button type="button" onClick={() => runTest(p)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Test</button>
      <button type="button" onClick={() => setEditing(p)} className="rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">Edit</button>
      <button type="button" onClick={() => cfg.enabled ? setConfirmDisable(p) : void toggleEnabled(p, true)} className={cfg.enabled ? "border border-red-200 bg-white text-red-700 hover:bg-red-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}>{cfg.enabled ? "Disable" : "Enable"}</button>
    </div>
  </td>
</tr>
))}
</tbody>
</table>
</div>
{editing && (
  <ProviderEditModal
    provider={editing}
    current={providers[editing]}
    onClose={() => setEditing(null)}
    onSave={async () => {
      setEditing(null);
      await reload();
    }}
  />
)}
<ConfirmDialog
  isOpen={confirmDisable !== null}
  title={Disable ${confirmDisable ?? ""} sign-in?}
  message="This will prevent new logins via this provider. Existing linked accounts remain linked."
  confirmLabel="Disable"
  variant="danger"
  onClose={() => setConfirmDisable(null)}
  onConfirm={async () => {
    if (confirmDisable) await toggleEnabled(confirmDisable, false);
    setConfirmDisable(null);
  }}
/>
</div>
*/
function ProviderEditModal({
  provider,
  current,
  onClose,
  onSave,
}: {
  provider: SocialProvider;
  current: AdminAuthProviderConfig;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [clientId, setClientId] = useState(current.clientId);
const [clientSecret, setClientSecret] = useState("");
const [redirectUri, setRedirectUri] = useState(current.redirectUri);
const [scopes, setScopes] = useState<string[]>(current.scopes);
const [enabled, setEnabled] = useState(current.enabled);
const [scopeInput, setScopeInput] = useState("");
const [busy, setBusy] = useState(false);
const addToast = useToastStore((s) => s.addToast);

const addScope = () => {
    const v = scopeInput.trim();
    if (!v) return;
    if (!scopes.includes(v)) setScopes([...scopes, v]);
    setScopeInput("");
};
const removeScope = (s: string) => setScopes(scopes.filter((x) => x !== s));

const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
        await adminAuthApi.update(provider, {
            enabled,
            clientId: clientId.trim(),
            clientSecret: clientSecret || undefined,
            redirectUri: redirectUri.trim(),
            scopes,
        });
        addToast("success", `${provider} configuration saved.`);
        await onSaved();
    } catch (err) {
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Save failed.";
        addToast("error", msg);
        setBusy(false);
    }
};

return (
    <Modal isOpen onClose={busy ? () => undefined : onClose}>
        <title>{"${SOCIAL_PROVIDER_META[provider].label} configuration"}</title>
        <form onSubmit={submit} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4"
                />
                Provider enabled
            </label>

            <Field label="Client ID">
                <input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="input-field"
                    placeholder="e.g. 1234567890-abc.apps.googleusercontent.com"
                    required={enabled}
                />
            </Field>

            <Field label={current.hasSecret ? "Client Secret (leave blank to keep current)" : ""}>
                <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="input-field"
                    placeholder={current.hasSecret ? "**** already set ****" : "paste new secret"}
                    required={enabled && current.hasSecret}
                    autoComplete="new-password"
                />
            </Field>

            <Field label="Redirect URI">
                <input
                    value={redirectUri}
                    onChange={(e) => setRedirectUri(e.target.value)}
                    className="input-field"
                    placeholder="https://your-app.example.com/auth/callback/google"
                    required={enabled}
                />
            </Field>

            <Field label="Scopes">
                <div className="flex flex-wrap gap-1.5">
                    {scopes.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {s}
                            <button
                                type="button"
                                onClick={() => removeScope(s)}
                                className="text-slate-400 hover:text-red-600"
                                aria-label={`Remove scope ${s}`}
                            >
                                x
                            </button>
                        </span>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
<input
    value={scopeInput}
    onChange={(e) => setScopeInput(e.target.value)}
    onKeyDown={(e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addScope();
        }
    }}
    className="input-field flex-1"
    placeholder="add scope"
/>
<button
    type="button"
    onClick={addScope}
    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
>
    Add
</button>
</div>
</Field>
<div className="flex justify-end gap-2 pt-2">
    <button
        type="button"
        disabled={busy}
        onClick={onClose}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
        Cancel
    </button>
    <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
    >
        {busy ? "Saving..." : "Save"}
    </button>
</div>
</form>
</Modal>
}
function Field({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <label className="block text-sm">
            <span className="font-medium text-slate-700">{label}</span>
            <div className="mt-1">{children}</div>
        </label>
    );
}