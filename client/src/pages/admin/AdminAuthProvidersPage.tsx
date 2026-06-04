/**
 * /admin/auth-providers
 *
 * Admin UI for the auth_provider_settings document. Lists each provider with its enabled state, redirect URI, scopes, linked-user count, and recent login count. Editing opens a side panel; secrets are write-only.
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
} from "@upcat/shared";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";
import Badge from "@/components/admin/Badge";
import StatCard from "@/components/admin/StatCard";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToastStore } from "@/stores/toastStore";

async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

const adminAuthApi = {
  list: () => unwrap<AdminAuthProviders>(apiClient.get(API_ROUTES.ADMIN.AUTH_PROVIDERS)),
  publish: () =>
    unwrap({
      exported: boolean;
      contentSize: number;
      payload: Record<string, unknown>;
    })(apiClient.post("/admin/auth/providers/publish")),
  update: (provider: SocialProvider, body: Partial<AdminAuthProviderConfig> & { clientSecret?: string }) => {
    return adminAuthApiConfig(
      apiClient.put(API_ROUTES.ADMIN.AUTH_PROVIDER(provider), body),
    );
  },
  test: (provider: SocialProvider) =>
    unwrap<{ ok: boolean; warnings: string[] }>(
      apiClient.post(API_ROUTES.ADMIN.AUTH_PROVIDER_TEST(provider)),
    ),
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
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalLinked = providers ? Object.values(providers).reduce((s, p) => s + p.linkedUsers, 0) : 0;
  const totalLogins = providers ? Object.values(providers).reduce((s, p) => s + p.logins7d, 0) : 0;
  const enabledCount = providers ? (SOCIAL_PROVIDERS as readonly SocialProvider[]).filter((p) => providers[p].enabled).length : 0;

  const toggleEnabled = async (provider: SocialProvider, next: boolean) => {
    try {
      await adminAuthApi.update(provider, { enabled: next });
      addToast("success", `${SOCIAL_PROVIDER_META[provider].label} ${next ? "enabled" : "disabled"}`);
      await reload();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Update failed.";
      addToast("error", msg);
    }
  };

  const runTest = async (provider: SocialProvider) => {
    try {
      const r = await adminAuthApi.test(provider);
      if (r.ok) addToast("success", `${provider}: configuration looks good.`);
      else addToast("warning", `${provider}: ${r.warnings.join(", ")}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Test failed.";
      addToast("error", msg);
    }
  };
}
const publishStaticProviders = async () => {
    setPublishing(true);
    try {
        const data = await adminAuthApi.publish();
        if (data?.payload) {
            const json = JSON.stringify(data.payload, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `auth-providers-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setLastPublished(new Date().toISOString());
            addToast("success", "Auth providers published! ${data.contentSize} bytes. Save to client/public/data/auth-providers.json");
        }
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
            addToast("error", "Admin session expired. Please sign in again.");
            return;
        }
        addToast("error", "Failed to publish auth providers.");
    } finally {
        setPublishing(false);
    }
};

if (loading || !providers) {
    return (
        <div className="flex justify-center py-20">
            <Spinner />
        </div>
    );
}

return (
    <div className="space-y-6">
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-amber-900">Publish Static Auth Providers</h2>
                    <p className="mt-1 text-xs text-amber-800">
                        Export enabled social provider visibility to a static snapshot for login/register pages.
                    </p>
                    {lastPublished && (
                        <p className="mt-1 text-xs text-amber-700">
                            Last published: <time>{new Date(lastPublished).toLocaleString()}</time>
                        </p>
                    )}
                </div>
            </div>
            <button
                type="button"
                disabled={publishing}
                onClick={() => void publishStaticProviders()}
                className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
                {publishing ? "Publishing..." : "Publish Now"}
            </button>
        </section>
    </div>
);
import { useState } from 'react';
import { Badge } from '@mui/material';

interface AdminAuthProviderConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

const SocialProviderMeta = [
  // ... other entries ...
];

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
  <Modal isOpen onClose={busy ? () => undefined : onClose}
         title={`${SOCIAL_PROVIDER_META[provider].label} configuration`} size="lg">
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
      <Field label={`Client Secret ${current.hasSecret ? "(leave blank to keep current)" : ""}`}>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          className="input-field"
          placeholder={current.hasSecret ? "**** already set ****" : "paste new secret"}
          required={enabled && !current.hasSecret}
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
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{s}</span>
          ))}
        </div>
      </Field>
    </form>
  </Modal>
);
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
        {...busy ? "Saving..." : "Save"}
    />
</div>
</form>
</Modal>

function Field({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <label className="block text-sm">
            <span className="font-medium text-slate-700">{label}</span>
            <div className="mt-1">{children}</div>
        </label>
    );
}