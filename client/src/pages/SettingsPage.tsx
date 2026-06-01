/**
 * /settings — reviewee/admin·self-service·surface.
 *
 * Sections:
 * ...1. Profile (read-only·summary).
 * ...2. Linked social·accounts (link/unlink).
 * ...3. Password (set·or·change).
 * ...4. Danger·zone (permanent·account·deletion).
 */
import {useEffect, useMemo, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  DATA_DELETION_GRACE_DAYS,
  type DataExportOptions,
  type DataRequest,
  type DeletionScope,
  type ExportFormat,
  type LinkedAccount,
  RECOVERY_CODE_COUNT,
  type RecoveryCodesStatus,
  SECURITY_QUESTION_BANK,
  SECURITY_QUESTIONS_REQUIRED,
  SOCIAL_PROVIDER_META,
  type SocialProvider,
  validatePassword,
} from "@upcat/shared";
import {oidcApi} from "@/lib/oidcApi";
import {dataExportApi, deletionApi, emailPreferencesApi, recoveryApi} from "@/lib/accountApi";
import {helpApi} from "@/lib/helpApi";
import {useAuthStore} from "@/stores/authStore";
import {useToastStore} from "@/stores/toastStore";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import Modal from "@/components/Modal";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";
import NotificationsSection from "@/components/NotificationsSection";
import SessionsSection from "@/components/SessionsSection";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const data = await oidcApi.linkedAccounts();
      setAccounts(data.accounts);
      setHasPassword(data.hasPassword);
    } catch {
      setAccounts([]);
      setHasPassword(true);
    }
  };

  useEffect(() => {
    if (!user) await fetchMe();
    await reload();
    setLoading(false);
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const lastSocialOnly = useMemo(
  () => hasPassword === false && (accounts?.length ?? 0) <= 1,
  [hasPassword, accounts],
);

const onUnlink = async (provider: SocialProvider) => {
  try {
    await oidcApi.unlink(provider);
    addToast("success", `${SOCIAL_PROVIDER_META[provider].label} unlinked.`);
    await reload();
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
      "Could not unlink that provider."
    addToast("error", msg);
  }
};

if (loading) {
  return (
    <div className="flex justify-center py-20">
      <Spinner/>
    </div>
  );
}

return (
  <div className="mx-auto max-w-3x1 space-y-8 px-4 py-10">
    <Seo title="Settings" description="Manage your account and linked sign-in providers." noindex/>
  </div>
  <header>
    <h1 className="text-2x1 font-bold text-gray-900">Account settings</h1>
    <p className="mt-1 text-sm text-gray-500">
{
  "Manage·how·you·sign·in", "your·password", "and·your·account·data."
}
</p>
</header>

{/* — Profile — */}
<Section title="Profile">
  <dl className="grid·grid-cols-1·gap-y-2·text-sm·sm:grid-cols-2">
    <Row label="Name">
      {user?.firstName} {user?.lastName}
    </Row>
    <Row label="Email">{user?.email}</Row>
    <Row label="Role">{user?.role??."reviewee}}</Row>
    <Row label="Verified">{user?.isVerified??."Yes"::"No}}</Row>
  </dl>
  {!hasPassword && (
    <p className="mt-4·rounded-lg·bg-amber-50·px-3·py-2·text-xs·text-amber-800">
      ▲ You signed in with a social provider only — set a password below so you don't lose
      access if that provider becomes unavailable.
    </p>
  )}
</Section>

{/* — Linked·accounts — */}
<Section title="Linked·accounts">
  {accounts && accounts.length > 0 ? (
    <ul className="divide-y·divide-gray-100·rounded-lg·border·border-gray-200">
      {accounts.map((a) => (
        <li>
          key={a.provider}
          className="flex·items-center·justify-between·gap-4·px-4·py-3"
        >
          <div className="min-w-0">
            <p className="text-sm·font-semibold·text-gray-900">
              {SOCIAL_PROVIDER_META[a.provider].label}
            </p>
            <p className="truncate·text-xs·text-gray-500">
              {a.email??."—"} · linked {new Date(a.linkedAt).toLocaleDateString()}
              {a.lastLoginAt
                ? `last used ${new Date(a.lastLoginAt).toLocaleDateString()}`
                : ""}
            </p>
          </div>
        </button>
        <type="button"
          onClick={() => onUnlink(a.provider)}
          disabled={lastSocialOnly}
          title={
            lastSocialOnly
            ? "Set a password before unlinking your only sign-in method."
            : ""
          }
        }
        className="rounded-md·border·border-red-200·bg-white·px-3·py-1.5·text-xs·font-semibold·text-red-700·hover:bg-red-50"+
        "disabled:cursor-not-allowed·disabled:opacity-50"
      >
        Unlink
      </button>
    </li>
  ))}
</ul>
) : (
  <p className="text-sm·text-gray-500">No·social·accounts·linked·yet.</p>
)

<div className="mt-4">
  <p className="mb-2·text-xs·font-semibold·uppercase·tracking-wide·text-gray-500">
    Link another account
  </p>
  <SocialLoginButtons purpose="link" divider={null}>
</div>
</Section>

{/* — Password — */}
<Section title={hasPassword ? "Change·password" : "Set a password"}>
  <PasswordSection hasPassword={!!hasPassword} onChanged={reload}/>
</Section>

{/* — Recovery·codes — */}
<Section title="Recovery·codes">
  <RecoveryCodesSection/>
</Section>

{/* — Security·questions — */}
<Section title="Security·questions">
  <SecurityQuestionsSection/>
</Section>

{/* — Data·export — */}
<Section title="Export·your·data">
  <DataExportSection/>
</Section>

{/* — Subscription·&·payments — */}
<Section title="Subscription·&·payments">
  <p className="text-sm·text-gray-600">
    Review your current plan, payment status, and manual submission history.
  </p>
  <Link to="/settings/payments" className="btn-primary·mt-3·inline-block">
    Manage subscription
  </Link>
</Section>

{/* — Support·tickets·shortcut — */}
<Section title="Support">
  <p className="text-sm·text-gray-600">
```json
// Need help? View your open tickets or start a new conversation with our team.
</p>
<Link to="/support" className="btn-primary mt-3 inline-block">
My support tickets
</Link>
</Section>

{/* — Email preferences — */}
<Section title="Email preferences">
<EmailPreferencesSection/>
</Section>

{/* — Notifications — */}
<Section title="Notifications">
<NotificationsSection/>
</Section>

{/* — Help & Guidance — */}
<Section title="Help & Guidance">
<HelpGuidanceSection/>
</Section>

{/* — Sessions & activity — */}
<Section title="Sessions & activity">
<SessionsSection/>
</Section>

{/* — Danger zone — */}
<Section title="Danger zone" tone="danger">
<p className="text-sm text-gray-600">
Schedule your account for permanent deletion. You'll receive an email to confirm,
and then have {DATA_DELETION_GRACE_DAYS} days to cancel before deletion runs.
</p>
<DeletionFlow
hasPassword={!!hasPassword}
onScheduled={() => {
addToast("success", "Check your email to confirm deletion.");
}}
onExecuted={() => {
addToast("success", "Your account has been deleted.");
logout();
navigate("/", {replace: true});
}}
/>
</Section>
</div>
);
}

/* — Email preferences — *//
function EmailPreferencesSection() {
const addToast = useToastStore((s) => s.addToast);
const [marketing, setMarketing] = useState<boolean>|null>(null);
const [saving, setSaving] = useState(false);

useEffect(() => {
emailPreferencesApi.get()
then(({emailPreferences}) => setMarketing(emailPreferences.marketing))
catch(() => setMarketing(true));
}, []);

const handleToggle = async (value: boolean) => {
setSaving(true);
try {
const {emailPreferences} = await emailPreferencesApi.update({marketing: value});
setMarketing(emailPreferences.marketing);
addToast("success", "Email preferences saved.");
catch {
addToast("error", "Could not save preferences. Try again.");
finally {
setSaving(false);
}
};
}

if (marketing === null) {
return <Spinner/>
}
return (
<div className="space-y-4">
<p className="text-sm text-gray-600">
Control which optional emails we send you. Transactional messages (email verification,
password reset) are always sent regardless of this setting.
</p>
<label className="flex cursor-pointer items-start gap-4">
<div className="relative mt-0.5 flex-shrink-0">
<input
type="checkbox"
className="sr-only"
checked={marketing}
disabled={saving}
onChange={(e) => handleToggle(e.target.checked)}
/>
<div
onClick={() => !saving && handleToggle(!marketing)}
role="switch"
aria-checked={marketing}
aria-label="Newsletters, promotions, and announcements"
className={`h-5 w-9 cursor-pointer rounded-full transition-colors ${
marketing ? "bg-primary-600" : "bg-gray-300"
} ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
>
</span>
className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
  marketing ? "translate-x-4" : "translate-x-0.5"
}`}
/>
</div>
</div>
<div>
<p className="text-sm font-medium text-gray-900">
Newsletters, promotions &amp; announcements
</p>
<p className="mt-0.5 text-xs text-gray-500">
Feature release updates, promotional offers, tips, and platform news.
</p>
</div>
</label>
</div>
);
}

/* --------------------------------------------------------------------------- */

function Section({
  title,
  tone = "default",
  children,
}): {
  title: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}): {
  return (
    <section>
      <className={`rounded-x1 border bg-white p-6 shadow-sm ${
        tone === "danger" ? "border-red-200" : "border-gray-200"
      }`}
    >
      <h2>
        <className={`mb-4 text-base font-semibold ${
          tone === "danger" ? "text-red-700" : "text-gray-900"
        }`}
      >
        {title}
        </h2>
        {children}
      </section>
    );
  }

  function Row({label, children}: {label: string; children: React.ReactNode}) {
    return (
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
      </div>
    );
  }

  /* --- Set / change password ------------------------------------------- */
  function PasswordSection({
    hasPassword,
    onChanged,
    children: {
      hasPassword: boolean;
      onChanged: () => Promise<void>;
    }): {
      const addToast = useToastStore((s) => s.addToast);
      const [current, setCurrent] = useState("");
      const [next, setNext] = useState("");
      const [confirm, setConfirm] = useState("");
      const [busy, setBusy] = useState(false);

      const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (next !== confirm) {
          addToast("error", "Passwords do not match.");
          return;
        }
        const check = validatePassword(next);
        if (!check.isValid) {
          addToast("error", check.errors[0] ?? "Password too weak.");
          return;
        }
        setBusy(true);
        try {
          await oidcApi.setPassword({
            newPassword: next,
            confirmNewPassword: confirm,
            currentPassword: hasPassword ? current : undefined,
          });
          addToast("success", hasPassword ? "Password changed." : "Password set.");
          setCurrent("");
          setNext("");
          setConfirm("");
          await onChanged();
        } catch (err) {
          const msg =
            (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
            "Could not save password."
          addToast("error", msg);
        } finally {
          setBusy(false);
        }
      };
    };
  }
}
return (
  <form onSubmit={submit} className="space-y-3">
    {hasPassword && (
      <Field label="Current password">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="input-field"
        />
      </Field>
    )}
    <Field label="New password">
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
        className="input-field"
      />
    </Field>
    <Button type="submit" disabled={busy} className="btn-primary">
      {busy ? "Saving..." : hasPassword ? "Change password" : "Set password"}
    </Button>
  </form>
);
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function HelpGuidanceSection() {
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const [showTooltips, setShowTooltips] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [reducedHelp, setReducedHelp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prefs = user?.help?.helpPreferences;
    if (!prefs) return;
    setShowTooltips(prefs.showTooltips ?? true);
    setShowOnboarding(prefs.showOnboarding ?? true);
    setReducedHelp(prefs.reducedHelp ?? false);
  }, [user?.help?.helpPreferences]);

  async function save(next) {
    showTooltips?: boolean;
    showOnboarding?: boolean;
    reducedHelp?: boolean;
    resetDismissed?: boolean;
  }) {
    setSaving(true);
    try {
      await helpApi.updatePreferences(next);
      addToast("success", "Help preferences updated.");
    } catch {
      addToast("error", "Failed to update help preferences.");
    } finally {
      setSaving(false);
    }
  }
}

return (
  <div className="space-y-3" data-help="set_help_prefs">
    <Toggle
      label="Show help tooltips (?) on pages"
      description="Contextual help icons appear next to complex features"
      checked={showTooltips}
      onChange={async (value) => {
        setShowTooltips(value);
        await save({showTooltips: value});
      }}
    />
    <Toggle
      label="Show onboarding guides for new features"
      description="Interactive tours appear when you first encounter a feature"
      checked={showOnboarding}
      onChange={async (value) => {
        setShowOnboarding(value);
        await save({showOnboarding: value});
      }}
    />
  )
}
checked={reducedHelp}
onChange={async(value)=>{
setReducedHelp(value);
await save({reducedHelp:value});
}}
/>

<div className="pt-2">data-help="set_replay_tour">
<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Replay Tours</p>
<div className="flex flex-wrap gap-2">
<ReplayButton flowId="new_user_tour" label="Replay Welcome Tour"/>
<ReplayButton flowId="first_practice_tour" label="Replay Practice Test Guide"/>
<ReplayButton flowId="first_mock_tour" label="Replay Mock Exam Guide"/>
<button
type="button"
disabled={saving}
className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
onClick={()=>void save({resetDismissed:true})}
>
Reset all dismissed help
</button>
</div>
</div>
);
}

function ReplayButton({flowId, label}:{flowId:string; label:string}){
const addToast = useToastStore((s)=>s.addToast);
return (
<button
type="button"
className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
onClick={async()=>{
try{
await helpApi.onboardingFlow(flowId,{manual:true});
localStorage.setItem(
"upcat.onboarding.state.v1",
JSON.stringify({flowId,stepIndex:0,completedSteps:[[]]}),
);
window.location.href="/dashboard";
}catch{
addToast("error","Unable to start this tour right now.");
}
}}
>
{
label:string;
description:string;
checked:boolean;
onChange:(value:boolean)=>void;
}{
return (
<label className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
<div>
<p className="text-sm font-medium text-slate-900">{label}</p>
<p className="text-xs text-slate-600">{description}</p>
</div>
<input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)}
className="mt-1 h-4 w-4"/>
</label>
);
}

/*——Recovery codes——*/

function RecoveryCodesSection() {
const addToast = useToastStore((s)=>s.addToast);
const [status, setStatus] = useState<RecoveryCodesStatus|null>(null);
const [codes, setCodes] = useState<string[]|null>(null);
const [busy, setBusy] = useState(false);
const [confirmed, setConfirmed] = useState(false);

const load = async()=>{
try{
setStatus(await recoveryApi.status());
}catch{
setStatus({hasRecoveryCodes:false,generatedAt:null,unusedCount:0,totalCount:0});
}
};

useEffect(()=>{
load();
},[]);

const generate = async()=>{
if(
status?.hasRecoveryCodes &&
!window.confirm(
"Generating new codes will invalidate your existing recovery codes. Continue?",
)
)
return;
setBusy(true);
try{
const r = await recoveryApi.generateCodes();
setCodes(r.codes);
setConfirmed(false);
await load();
} catch (err) {
const msg =
(err as { response?: { data?: { error?: string } } }).response?.data?.error ||
"Could not generate codes."
addToast("error", msg);
} finally {
setBusy(false);
}
};

const copyAll = () => {
if (!codes) return;
void navigator.clipboard.writeText(codes.join("\n"));
addToast("success", "Codes copied to clipboard.");
};

const downloadAll = () => {
if (!codes) return;
const blob = new Blob([
  `UPCAT Simulator - Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\n` +
  codes.join("\n") +
  "\n",
  ],
  {type: "text/plain"},
);
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "upcat-recovery-codes.txt";
a.click();
URL.revokeObjectURL(url);
};

if (!status) return <Spinner/>;

return (
<div className="space-y-3 text-sm text-gray-700">
<p>
Recovery codes let you sign in if you lose access to your password and social
providers. Each code works once.
</p>
<p className="text-xs text-gray-500">
{status.hasRecoveryCodes
? `${status.unusedCount}/${status.totalCount} codes remaining • generated ${
status.generatedAt ? new Date(status.generatedAt).toLocaleDateString() : "—"
}`
```

You have no recovery codes yet. Generate ${RECOVERY_CODE_COUNT} codes you can store securely.`

</p>
<button onClick={generate} disabled={busy} className="btn-primary">
{busy ? "Generating..." : status.hasRecoveryCodes ? "Regenerate codes" : "Generate codes"}
</button>

<Modal
isOpen={!!codes}
onClose={() => confirmed && setCodes(null)}
title="Save your recovery codes"
hideCloseButton={!confirmed}
>
<div className="space-y-3 text-sm">
<p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
These codes will only be shown once. Save them somewhere safe.
</p>
<pre className="grid-grid-cols-2 gap-2 rounded-md bg-gray-50 p-3 font-mono text-xs">
{codes?.map((c) => <span key={c}>{c}</span>)}
</pre>
<div className="flex flex-wrap gap-2">
<button onClick={copyAll} className="btn-secondary text-xs">
Copy
</button>
<button onClick={downloadAll} className="btn-secondary text-xs">
Download.txt
</button>
</div>
<label className="flex items-start gap-2 text-xs text-gray-700">
<input
type="checkbox"
checked={confirmed}
onChange={(e) => setConfirmed(e.target.checked)}
/>
I've saved my recovery codes in a safe place.
</label>
<div className="flex justify-end">
<button
type="button"
onClick={() => setCodes(null)}
disabled={!confirmed}
className="btn-primary text-xs">
Done
</button>
</div>
</div>
</Modal>
</div>
);
}

/* --- Security questions --- */
function SecurityQuestionsSection() {
const addToast = useToastStore((s) => s.addToast);
const [picks, setPicks] = useState<number[]>([0, 1, 2]);
const [answers, setAnswers] = useState<string[]>(["", "", ""]);
const [busy, setBusy] = useState(false);

const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (new Set(picks).size !== SECURITY_QUESTIONS_REQUIRED) {
    return addToast("error", "Please pick three different questions.");
  }
  if (answers.some((a) => a.trim().length < 2)) {
    return addToast("error", "Answers must be at least 2 characters.");
  }
  setBusy(true);
  try {
    await recoveryApi.setSecurityQuestions({
      questions: picks.map((i, idx) => ({
        question: SECURITY_QUESTION_BANK[i]!
        answer: answers[idx]!
      })),
    });
    addToast("success", "Security questions saved.");
    setAnswers(["", "", ""]);
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
      "Could not save your answers."
    addToast("error", msg);
  } finally {
    setBusy(false);
  }
};

return (
  <form onSubmit={submit} className="space-y-3 text-sm">
    <p className="text-gray-600">
      Pick {SECURITY_QUESTIONS_REQUIRED} questions and provide answers only you'd know. We store the answers hashed; we can never read them.
    </p>
    {[0, 1, 2].map((slot) => (
      <div key={slot} className="space-y-1">
        <select
          value={picks[slot]}
          onChange={(e) =>
            setPicks((prev) => {
              const next = [...prev];
              next[slot] = Number(e.target.value);
              return next;
            })
          }
          className="input-field"
        >
          {SECURITY_QUESTION_BANK.map((q, i) => (
            <option key={q} value={i}>
              {q}
            </option>
          ))}
        </select>
        <input
          required
          value={answers[slot]}
          placeholder="Your answer"
          onChange={(e) =>
            setAnswers((prev) => {
              const next = [...prev];
              next[slot] = e.target.value;
              return next;
            })
          }
          className="input-field"
        />
      </div>
    ))}
    <button type="submit" disabled={busy} className="btn-primary">
      {busy ? "Saving..." : "Save security questions"}
    </button>
  </form>
);
}

/* Data export ---------------------------------------------------------*/
function DataExportSection() {
  const addToast = useToastStore((s) => s.addToast);
  const [recent, setRecent] = useState<DataRequest[]>({null});
  const [opts, setOpts] = useState<DataExportOptions>({
    format: "json",
    includeExamHistory: true,
    includeStats: true,
    includePersonalInfo: true,
    includeActivityLog: false,
  });
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const r = await dataExportApi.list();
      setRecent(r.requests);
    } catch {
      setRecent([]);
    }
  };

  useEffect(() => {
    reload();
  });
}
}, []);

const request = async () => {
  setBusy(true);
  try {
    await dataExportApi.create(opts);
    addToast("success", "Export queued. You'll get an email when it's ready.");
    await reload();
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
      "Could not create export."
    addToast("error", msg);
  } finally {
    setBusy(false);
  }
};

const download = async (id: string, format: ExportFormat) => {
  try {
    const blob = await dataExportApi.download(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upcat-data-${id}.${format === "csv" ? "zip" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    addToast("error", "Could not download export.");
  }
};

return (
  <div className="space-y-4 text-sm">
    <p className="text-gray-600">
      Download a copy of your account data. Exports are limited to 1 per 24 hours.
    </p>
    <fieldset className="space-y-2">
      <legend className="font-semibold text-gray-700">Include</legend>
      {(
        [
          ["includePersonalInfo", "Profile & personal info"],
          ["includeExamHistory", "Exam sessions & answers"],
          ["includeStats", "Stats & progress"],
          ["includeActivityLog", "Activity / audit log"],
        ] as const
      ).map(([k, l]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={opts[k]}
            onChange={(e) => setOpts((o) => ({...o, [k]: e.target.checked}))}
          />
        )
        className="input-field mt-1"
      )
        <option value="json">JSON</option>
        <option value="csv">CSV (zipped)</option>
      </select>
    </label>
    <button onClick={request} disabled={busy} className="btn-primary">
      {busy ? "Requesting..." : "Request export"}
    </button>

    {recent && recent.length > 0 && (
      <div className="border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Recent exports
        </p>
        <ul className="divide-y divide-gray-100 rounded-md border-border-gray-200">
          {recent.map((r) => {
            const ready = r.status === "ready";
            return (
              <li
                key={r._id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {r.export?.format.toUpperCase() ?? "JSON"} {"."}
                    {new Date(r.requestedAt).toLocaleString()}
                  </p>
                  <p className="text-gray-500">
                    {r.status}
                    {r.export?.expiresAt}
                    ? ` expires ${new Date(r.export.expiresAt).toLocaleString()}`
                    : ""
                  </p>
                </div>
              </div>
            )}
            {ready && r.export && (
              <button
                onClick={() => download(r._id, r.export!.format)}
              {
                className="btn-secondary text-xs"
              }
              >
/* ---- Scheduled deletion flow ----------------------------------------- */
function DeletionFlow({
  hasPassword,
  onScheduled,
  onExecuted,
}) {
  hasPassword: boolean;
  onScheduled: () => void;
  onExecuted: () => void;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [pending, setPending] = useState<DataRequest|null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<DeletionScope>("full");
  const [retainStats, setRetainStats] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await deletionApi.current();
      setPending(r.request);
    } catch {
      setPending(null);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfirmation("");
    setPassword("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
      return addToast("error", `Please type "${ACCOUNT_DELETE_CONFIRMATION}" exactly.`);
    }
    if (hasPassword && !password) return addToast("error", "Password is required.");
    setBusy(true);
    try {
      await deletionApi.create({
        scope,
        retainAnonymizedStats: retainStats,
        password: hasPassword ? password : undefined,
      });
      onScheduled();
      close();
      await load();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Could not schedule deletion."
        addToast("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!pending) return;
    if (!window.confirm("Cancel your pending deletion request?")) return;
    try {
      await deletionApi.cancel(pending._id);
      addToast("success", "Deletion cancelled.");
      await load();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Could not cancel deletion."
        addToast("error", msg);
    }
  };

  if (!loaded) return null;

  // A pending deletion exists -- show status card.
  if (pending && (pending.status === "pending" || pending.status === "processing")) {
    const scheduled = pending.deletion?.scheduledFor
      ? new Date(pending.deletion.scheduledFor)
      : null;
    return (
<div className="mt-3·rounded-md·border·border-red-200·bg-red-50·p-3·text-sm">
  <p className="font-semibold·text-red-900">Deletion·scheduled</p>
  <p className="mt-1·text-xs·text-red-800">
    Status: <strong>{pending.status}</strong>
    {scheduled·&& (
      <>
        {"."}
        scheduled·for <strong>{scheduled.toLocaleString()}</strong>
      </>
    )}
    {!pending.deletion?.confirmedAt·&& (
      <> awaiting·email·confirmation</>
    )}
  </p>
  <button
    type="button"
    onClick={() => setOpen(true)}
    className="mt-2·rounded-md·border·border-red-300·bg-white·px-3·py-1.5·text-xs·font-semibold·text-red-700·hover:bg-red-100"
  >
    Cancel·deletion
  </button>
</div>
);
}

// No pending deletion → show schedule button.
return (
  <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-4·rounded-md·border·border-red-300·bg-white·px-4·py-2·text-sm·font-semibold·text-red-700·hover:bg-red-50"
    >
      Delete my account
    </button>
    <Modal isOpen={open} onClose={close} title="Schedule·account·deletion" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-md·bg-red-50·p-3·text-xs·text-red-800">
          <p className="font-semibold">
            You'll have {DATA_DELETION_GRACE_DAYS} days to change your mind. After that:
          </p>
          <ul className="mt-1·list-inside·list-disc·space-y-0.5">
            <li>Your profile and login credentials are deleted.</li>
            <li>All linked social providers are unlinked.</li>
            <li>Past exam sessions are anonymized (or removed entirely).</li>
            <li>Your contact messages are deleted.</li>
          </ul>
        </div>

        <fieldset>
          <legend className="text-sm·font-semibold·text-gray-800">Scope</legend>
          <label className="mt-1·flex·items-start·gap-2·text-sm">
            <input
              type="radio"
              name="scope"
              checked={scope === "full"}
              onChange={() => setScope("full")}
            />
          </span>
          <strong>Full deletion</strong> -- remove account + all associated data.
        </span>
      </label>
      <label className="mt-1·flex·items-start·gap-2·text-sm">
        <input
          type="radio"
          name="scope"
          checked={scope === "data_only"}
          onChange={() => setScope("data_only")}
        />
        <span>
          <strong>Data only</strong> -- keep your account but wipe exam history /
personal data.
        </span>
      </label>
    </fieldset>

    <label className="flex·items-start·gap-2·text-sm">
      <input
        type="checkbox"
        checked={retainStats}
        onChange={(e) => setRetainStats(e.target.checked)}
      />
      <span>
        Allow my anonymized aggregate stats to remain (helps platform improvements).
      </span>
    </label>

    <Field label={`Type "${ACCOUNT_DELETE_CONFIRMATION}" to confirm`}>
      <input
        autoFocus
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        className="input-field"
      />
    </Field>
    {hasPassword&&(
      <Field label="Re-enter your password">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        className="input-field"
      />
    </Field>
  )
}
<div className="flex·justify-end·gap-2·pt-2">
  <button
    type="button"
    onClick={close}
    disabled={busy}
    className="rounded-md·border·border-gray-300·bg-white·px-4·py-2·text-sm·font-medium·text-gray-700·hover:bg-gray-50"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={busy}
    className="rounded-md·bg-red-600·px-4·py-2·text-sm·font-semibold·text-white·hover:bg-red-700·disabled:opacity-60"
  >
    {busy?:"Scheduling...":::"Schedule deletion"}
  </button>
</div>
</form>
</Modal>
{/* Reference to avoid "unused" for onExecuted in this layout (kept for parity with old API).*/}
<span className="hidden">data-handler={onExecuted.toString().length}</span>
</>
);