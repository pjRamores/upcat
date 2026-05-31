/**
 * Phase 15c — Admin.Security.Console.
 *
 * Single page with six tabs: Dashboard / Events / IPs / Blocked / Config / Reports.
 * Each tab is a self-contained component that fetches lazily on activation.
 */
import {useEffect, useMemo, useState} from "react";
import {type AdminDashboard, adminSecurityApi} from "@/lib/securityApi";

type Tab = "dashboard" | "events" | "ips" | "blocked" | "config" | "reports";

const TABS: {id: Tab; label: string}[] = [
  {id: "dashboard", label: "Dashboard"},
  {id: "events", label: "Events"},
  {id: "ips", label: "IP Intelligence"},
  {id: "blocked", label: "Blocked"},
  {id: "config", label: "Config"},
  {id: "reports", label: "Reports"},
];

export default function AdminSecurityPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                ? "border-b-2 border-blue-600 px-4 py-2 text-sm font-medium text-blue-700"
                : "border-b-2 border-transparent px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              }
            )
          </nav>
        </div>
        {tab === "dashboard" && <DashboardTab/>}
        {tab === "events" && <EventsTab/>}
        {tab === "ips" && <IpsTab/>}
        {tab === "blocked" && <BlockedTab/>}
        {tab === "config" && <ConfigTab/>}
        {tab === "reports" && <ReportsTab/>}
      </div>
    );
  }

  // --- Dashboard --------------------------------------------------------

  function DashboardTab() {
    const [data, setData] = useState<AdminDashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
      let cancelled = false;
      adminSecurityApi
        .dashboard()
        .then((d) => !cancelled && setData(d))
        .catch((e) => !cancelled && setError((e as Error).message));
      return () => {
        cancelled = true;
      };
    }, []);
    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!data) return <p className="text-sm text-gray-500">Loading...</p>;
    const o = data.overview;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="System.status" value={o.systemStatus} tone={statusTone(o.systemStatus)}/>
          <Kpi label="Active.threats" value={o.activeThreats}/>
          <Kpi label="Blocked.IPs" value={o.blockedIPs}/>
          <Kpi label="Events.today" value={o.securityEventsToday}/>
          <Kpi label="Avg.threat.score" value={Math.round(o.avgThreatScore)}/>
        </div>
        {o.lockdown && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <strong>Lockdown active.</strong> Non-admin traffic is being rejected.
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <Card.title="Recent events">
            <ul className="divide-y divide-gray-200 text-sm">
              {data.recentEvents.slice(0, 10).map((e, i) => (
                <li key={i} className="py-1.5">
                  <div className="flex justify-between">
                    <span>{String((e as {type?: string}).type)}</span>
                    <span className="text-xs text-gray-500">
                      {String((e as {severity?: string}).severity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="text-xs text-gray-500">
              {String((e as {source?: {ip?: string}}).source?.ip?? "")} · {"·"}
            </div>
            {new Date(String((e as {timestamp?: string}).timestamp)).toLocaleString()}
          </div>
        </div>
      </ul>
    </Card>
    <Card.title="Top threats (by score)">
function EventRow({ev, onChange}: {ev: Record<string, unknown}; onChange: () => void}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = String(ev._id);
  const src = (ev.source as {ip?: string}) | undefined) ?? {};
  async function review(action?: string) {
    setBusy(true);
    try {
      await adminSecurityApi.reviewEvent(id, {action});
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-2 py-1 text-xs">
          {new Date(String(ev.timestamp)).toLocaleString()}
        </td>
        <td className="px-2 py-1">{String(ev.type)}</td>
        <td className="px-2 py-1">{String(ev.severity)}</td>
        <td className="px-2 py-1 font-mono text-xs">{src.ip??"}</td>
        <td className="px-2 py-1">{ev.reviewed??"}</td>
        <td className="px-2 py-1 text-right">
          <button type="button" onClick={() => setOpen(!open)} className="text-xs text-primary-600">
            {open ? "Close" : "View"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50">
          <td className="px-2 py-2">
            <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-xs">
              {JSON.stringify(ev, null, 2)}
            </pre>
            {!ev.reviewed && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => review("dismiss")}
                  className="rounded-border border-gray-300 px-3 py-1 text-xs"
                >
                  Dismiss
                  </button>
                  {src.ip && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => review("block_ip")}
                      className="rounded-border border-red-300 px-3 py-1 text-xs text-red-700"
                    >
                  Block IP
                  </button>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// IPs

function IpsTab() {
  const [data, setData] = useState({
    items: Array<Record<string, unknown>>;
    total: number;
    totalPages: number;
  }) | null>(null);
  const [page, setPage] = useState(1);
  const [minScore, setMinScore] = useState("50");

  async function reload() {
    const d = await adminSecurityApi.listIps({page, limit: 25, minScore});
    setData(d);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, minScore]);

  async function block(ip: string) {
    const reason = prompt(`Reason for blocking ${ip}?`) ?? "";
    if (!reason) return;
    await adminSecurityApi.blockIp(ip, {severity: "hard", reason});
    void reload();
  }

  async function unblock(ip: string) {
    await adminSecurityApi.unblockIp(ip);
    void reload();
  }
}
return (
  <div className="space-y-4">
    <div className="flex-items-center gap-2">
      <label className="text-sm text-gray-600">Min threat score:</label>
      <input
        value={minScore}
        onChange={(e) => setMinScore(e.target.value.replace(/\D/g, ""))}
        className="w-20 rounded-border border-gray-300 px-2 py-1 text-sm"
      />
      <BlockRangeForm onDone={reload}/>
    </div>
  </div>
  {!data ? (
    <p className="text-sm text-gray-500">Loading...</p>
  ) : (
    <>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
          <tr>
            <th className="px-2 py-1">IP</th>
            <th className="px-2 py-1">Reputation</th>
            <th className="px-2 py-1">Score</th>
            <th className="px-2 py-1">Country</th>
            <th className="px-2 py-1">Requests</th>
            <th className="px-2 py-1"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.items.map((row, i) => {
            const ip = String(row._id);
            const activity = (row.activity as {totalRequests?: number }) | undefined) ?? {};
            return (
              <tr key={i}>
                <td className="px-2 py-1 font-mono text-xs">{ip}</td>
                <td className="px-2 py-1">{String(row.reputation)}</td>
                <td className="px-2 py-1">{String(row.threatScore)}</td>
                <td className="px-2 py-1">{String(row.country?? "")}</td>
                <td className="px-2 py-1">{activity.totalRequests?? 0}</td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => block(ip)}
                    className="mr-2 text-xs text-red-600"
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    onClick={() => unblock(ip)}
                    className="text-xs text-gray-600"
                  >
                    Unblock
                  </button>
                </td>
              </tr>
            )};
          })}
        </tbody>
      </table>
      <Pagination page={page} total={data.totalPages} onChange={setPage}/>
    </>
  )}
</div>
);
}

function BlockRangeForm({onDone}: {onDone: () => void}) {
  const [cidr, setCidr] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!cidr) return;
    setBusy(true);
    try {
      await adminSecurityApi.blockRange({cidr, reason});
      setCidr("");
      setReason("");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <input
        value={cidr}
        onChange={(e) => setCidr(e.target.value)}
        placeholder="CIDR (1.2.3.0/24)"
        className="rounded-border border-gray-300 px-2 py-1 text-sm"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="reason"
        className="rounded-border border-gray-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={busy || !cidr}
        onClick={submit}
        className="rounded-bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-50"
      />
    </div>
  );
}
Block range
</button>
</div>
);
}

// Blocked

function BlockedTab() {
const [data, setData] = useState({
items: Array<Record<string, unknown>>;
total: number;
} | null>(null);
const [filterActive, setFilterActive] = useState("true");
const [form, setForm] = useState({type: "ip", value: "", reason: ""});

async function reload() {
const d = await adminSecurityApi.listBlocked({active: filterActive});
setData(d);
}

useEffect(() => {
void reload();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [filterActive]);

async function add() {
if (!form.value) return;
await adminSecurityApi.addBlock(form);
setForm({type: "ip", value: "", reason: ""});
void reload();
}

return (
<div className="space-y-4">
<div className="flex flex-wrap items-end gap-2 rounded bg-gray-50 p-3">
<select
value={form.type}
onChange={(e) => setForm({...form, type: e.target.value})}
className="rounded-border border-gray-300 px-2 py-1 text-sm"
>
<option value="ip">IP</option>
<option value="ip_range">CIDR</option>
<option value="fingerprint">Fingerprint</option>
<option value="email_domain">Email domain</option>
<option value="user_agent_pattern">User-agent regex</option>
</select>
<input
value={form.value}
onChange={(e) => setForm({...form, reason: e.target.value})}
placeholder="value"
className="rounded-border border-gray-300 px-2 py-1 text-sm"
/>
<input
value={form.reason}
onChange={(e) => setForm({...form, reason: e.target.value})}
placeholder="reason"
className="rounded-border border-gray-300 px-2 py-1 text-sm"
/>
<button
type="button"
onClick={add}
className="rounded-bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
>
Add block
</button>
<select
value={filterActive}
onChange={(e) => setFilterActive(e.target.value)}
className="ml-auto rounded-border border-gray-300 px-2 py-1 text-sm"
>
<option value="">All</option>
<option value="true">Active</option>
<option value="false">Inactive</option>
</select>
</div>
{!data ? (
<p className="text-sm text-gray-500">Loading...</p>
) : (
<table className="w-full text-sm">
<thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
<tr>
<th className="px-2 py-1">Type</th>
<th className="px-2 py-1">Value</th>
<th className="px-2 py-1">Severity</th>
<th className="px-2 py-1">Reason</th>
<th className="px-2 py-1">Active</th>
<th className="px-2 py-1"></tr>
</thead>
<tbody>
<tbody className="divide-y divide-gray-200">
{data.items.map((b, i) => (
<tr key={i}>
<td className="px-2 py-1">{String(b.type)}</td>
<td className="px-2 py-1 font-mono text-xs">{String(b.value)}</td>
<td className="px-2 py-1">{String(b.severity)}</td>
<td className="px-2 py-1">{String(b.reason)}</td>
<td className="px-2 py-1">{b.isActive ? "✓" : ""}</td>
<td className="px-2 py-1 text-right">
{Boolean(b.isActive) && (
<button
type="button"
onClick={async(() => {
await adminSecurityApi.removeBlock(String(b._id));
void reload();
}
className="text-xs·text-red-600"
>
Remove
</button>
}
</td>
</tr>
})
</tbody>
</table>
}
</div>
);
}

// Config

function ConfigTab() {
const [json, setJson] = useState<string>("");
const [original, setOriginal] = useState<string>("");
const [password, setPassword] = useState("");
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string>|null>(null);
const [msg, setMsg] = useState<string>|null>(null);

async function load() {
const cfg = await adminSecurityApi.getConfig();
const pretty = JSON.stringify(cfg, null, 2);
setJson(pretty);
setOriginal(pretty);
}

useEffect(() => {
void load();
}, []);

const dirty = json!==original;

async function save() {
setError(null);
setMsg(null);
let parsed: Record<string, unknown>;
try {
parsed = JSON.parse(json);
} catch (e) {
setError("Invalid JSON: "+(e as Error).message);
return;
}
if (!password) {
setError("Password required");
return;
}
setBusy(true);
try {
await adminSecurityApi.updateConfig(parsed, password);
setMsg("Saved.");
setPassword("");
await load();
} catch (e) {
setError((e as Error).message);
} finally {
setBusy(false);
}
}

return (
<div className="space-y-3">
<LockdownControl/>
<p className="text-sm·text-gray-600">
Edit the live security config. Saves require your admin password and take effect
within 60 seconds.
</p>
<textarea
value={json}
onChange={(e) => setJson(e.target.value)}
rows={24}
className="w-full·rounded·border·border-gray-300·p-2·font-mono·text-xs"
/>
<div className="flex·items-center·gap-2">
<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
placeholder="Admin·password"
className="rounded·border·border-gray-300·px-2·py-1·text-sm"
/>
<button
type="button"
disabled={!dirty||busy}
onClick={save}
className="rounded·bg-primary-600·px-3·py-1·text-sm·text-white·hover:bg-primary-700·disabled:opacity-50"
>
Save changes
</button>
{error && <span className="text-sm·text-red-600">{error}</span>}
{msg && <span className="text-sm·text-green-600">{msg}</span>}
</div>
</div>
);
}
function LockdownControl() {
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState<boolean>|null>(null);

  useEffect(() => {
    adminSecurityApi.getConfig()
    .then((c) => setEnabled(Boolean((c as {lockdown?: {enabled?: boolean}})).lockdown?.enabled)))
    .catch(() => undefined);
  }, []);

  async function toggle() {
    if (!password) return;
    if (!confirm(enabled ? "Disable lockdown?" : "ENABLE LOCKDOWN? Non-admin traffic will be blocked.")) return;
    setBusy(true);
    try {
      if (enabled) await adminSecurityApi.disableLockdown(password);
      else await adminSecurityApi.enableLockdown(password);
      setEnabled(!enabled);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      className={
        enabled
        ? "rounded·border·border-red-300·bg-red-50·p-3"
        : "rounded·border·border-gray-200·bg-gray-50·p-3"
      }
    >
      <div className="flex·flex-wrap·items-center·gap-2">
        <strong className="text-sm">
          Emergency·lockdown: {enabled === null ? "..." : enabled ? "ENABLED" : "off"}
        </strong>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin·password"
          className="ml-auto·rounded·border·border-gray-300·px-2·py-1·text-sm"
        />
        <button
          type="button"
          onClick={toggle}
          disabled={busy || !password || enabled === null}
          className={
            enabled
            ? "rounded·bg-gray-700·px-3·py-1·text-sm·text-white·disabled:opacity-50"
            : "rounded·bg-red-600·px-3·py-1·text-sm·text-white·disabled:opacity-50"
          }
        >
          {enabled ? "Disable" : "Enable·lockdown"}
        </button>
      </div>
    </div>
  );
}

// Reports

function ReportsTab() {
  const [period, setPeriod] = useState<{"24h" | "7d" | "30d"">("24h");
  const [data, setData] = useState<Awaited<ReturnType<typeof adminSecurityApi.report>>|null>(null);
  useEffect(() => {
    let cancelled = false;
    adminSecurityApi.report(period).then((d) => !cancelled && setData(d));
    return () => {
      cancelled = true;
    };
  }, [period]);
  return (
    <div className="space-y-4">
      <div className="flex·gap-2">
        {["24h", "7d", "30d"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={
              period === p
              ? "rounded·bg-primary-600·px-3·py-1·text-sm·text-white"
              : "rounded·border·border-gray-300·px-3·py-1·text-sm"
            }
          >
            {p}
          </button>
        ))}
        <div>
          {!data ? (
            <p className="text-sm·text-gray-500">Loading...</p>
          ) : (
            <div className="grid·grid-cols-2·gap-3·md·grid-cols-4">
              <Kpi label="Total·events" value={data.totalEvents}/>
              <Kpi label="New·blocks" value={data.newBlocks}/>
              <Kpi
                label="Critical"
                value={data.bySeverity.find((s) => s._id === "critical")?.count ?? 0}
                tone="danger"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
<Kpi
  label="High"
  value={data.bySeverity.find((s) => s._id === "high")?.count ?? 0}
  tone="warn"
>
</div>
{data.recommendations.length > 0 && (
  <Card title="Recommendations">
    <ul className="list-disc·space-y-1·pl-5·text-sm·text-amber-800">
      {data.recommendations.map((r, i) => (
        <li key={i}>{r}</li>
      ))}
    </ul>
  </Card>
)}
<div className="grid·gap-6·md:grid-cols-2">
  <Card title="By·type">
    <BarList·rows={data.byType}/>
  </Card>
  <Card title="Top·countries">
    <BarList·rows={data.topCountries}/>
  </Card>
</div>
<Card title="Top·source·IPs">
  <BarList·rows={data.topIps·mono/>
</Card>
</>

// Shared bits

function BarList({
  rows,
  mono = false,
}): {
  rows: Array<{_id: string; count: number}};
  mono?: boolean;
}): {
  const max = useMemo(() => Math.max(1, ...rows.map((r) => r.count)), [rows]);
  return (
    <ul className="space-y-1·text-sm">
      {rows.map((r) => (
        <li key={r._id} className="flex·items-center·gap-2">
          <span className={mono ? "w-40·truncate·font-mono·text-xs" : "w-40·truncate"}>
            {r._id || "(unknown)"}
          </span>
          <div className="relative·h-4·flex-1·rounded·bg-gray-100">
            <div
              className="absolute·inset-y-0·left-0·rounded·bg-primary-500"
              style={{width: `${r.count / max} * 100}%`}}
            />
          </div>
          <span className="w-12·text-right·text-xs">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

// Shared bits

function Kpi({
  label,
  value,
  tone = "ok",
}): {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "danger";
}): {
  const cls =
    tone === "danger"
    ? "bg-red-50·border-red-200·text-red-700"
    : tone === "warn"
    ? "bg-amber-50·border-amber-200·text-amber-700"
    : "bg-white·border-gray-200·text-gray-800";
  return (
    <div className={`rounded border p-3 ${cls}`}>
      <div className="text-xs·uppercase·tracking-wide·opacity-70">{label}</div>
      <div className="mt-1·text-xl·font-semibold">{value}</div>
    </div>
  );
}

function Card({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="rounded·border·border-gray-200·bg-white·p-3">
      <h3 className="mb-2·text-sm·font-semibold·text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

function Pagination({
  page,
  total,
  onChange,
}): {
  page: number;
  total: number;
  onChange: (n: number) => void;
}): {
  if (total <= 1) return null;
return (
  <div className="flex-items-center gap-2 text-sm">
    <button
      type="button"
      disabled={page <= 1}
      onClick={() => onChange(page + 1)}
      className="rounded-border-border-gray-300 px-2 py-1 disabled:opacity-50"
    >
      Prev
    </button>
    <span>
      {page} / {total}
    </span>
    <button
      type="button"
      disabled={page >= total}
      onClick={() => onChange(page + 1)}
      className="rounded-border-border-gray-300 px-2 py-1 disabled:opacity-50"
    >
      Next
    </button>
  );
}