import {useEffect, useState} from "react";
import {adminApi} from "@/lib/adminApi";

type Tab = "dashboard" | "logs" | "alerts" | "checks";

export default function AdminMonitoringPage() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-6">
      <div className="border-b·border-gray-200">
        <nav className="-mb-px·flex·flex-wrap·gap-1">
          [
            ["dashboard", "Dashboard"],
            ["logs", "Logs"],
            ["alerts", "Alerts"],
            ["checks", "Health·Checks"],
            ] .map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as Tab)}
                className={
                  tab === id
                  ? "border-b-2·border-blue-600·px-4·py-2·text-sm·font-medium·text-blue-700"
                  : "border-b-2·border-transparent·px-4·py-2·text-sm·text-gray-600·hover:text-gray-900"
                }
              )
            )
          </nav>
        </div>

        {tab === "dashboard" && <DashboardTab/>}
        {tab === "logs" && <LogsTab/>}
        {tab === "alerts" && <AlertsTab/>}
        {tab === "checks" && <HealthChecksTab/>}
      </div>
    );
  );

  function DashboardTab() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<["1h" | "6h" | "24h" | "7d"]>(1h);
    const [data, setData] = useState<Record<string, unknown>>(null);

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.monitoringDashboard(range);
        setData(result);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

    const overview = (data?.overview ?? {}) as Record<string, unknown>;

    return (
      <div className="space-y-4">
        <div className="flex·flex-wrap·items-center·gap-2">
          {[["1h", "6h", "24h", "7d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={rounded-full border px-3 py-1.5 text-xs font-medium ${
                range === r
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }
            }
          )}
        </button>
        type="button"
        onClick={() => void adminApi.monitoringEvaluateRules().then(load)}
        className="rounded·border·border-slate-300·px-3·py-1.5·text-xs"
      >
        Evaluate Alert Rules
      </button>
      <button
        type="button"
        onClick={() => void adminApi.monitoringTestAlert().then(load)}
        className="rounded·border·border-amber-300·px-3·py-1.5·text-xs·text-amber-800"
      >
        Send Test Alert
      </button>
    </div>

    {loading ? <p className="text-sm·text-gray-500">Loading...</p> : null}
    {error ? <p className="text-sm·text-red-600">{error}</p> : null}
  );
}
{data}: (
<div className="grid-grid-cols-2·gap-3·md:grid-cols-4">
<Kpi label="Health" value={String(overview.health??"unknown")}/>
<Kpi label="Open·alerts" value={Number(overview.openAlerts??·0)}/>
<Kpi label="Requests" value={Number(overview.requests??·0)}/>
<Kpi label="Errors" value={Number(overview.errors??·0)}/>
<Kpi label="Error·rate" value={`${Number(overview.errorRatePercent??·0)}%`}/>
<Kpi label="P95·latency" value={`${Number(overview.p95LatencyMs??·0)}ms`}/>
<Kpi label="Degraded·checks" value={Number(overview.checksDegraded??·0)}/>
<Kpi label="Unhealthy·checks" value={Number(overview.checksUnhealthy??·0)}/>
</div>
)::null>
</div>
);
}

function LogsTab() {
const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string|·null>(null);
const [level, setLevel] = useState("");

async function load() {
setLoading(true);
setError(null);
try {
const result = await adminApi.monitoringLogs({level:·level||·undefined, limit:·50, page:·1});
setLogs(result.items);
} catch (e) {
setError((e as Error).message);
} finally {
setLoading(false);
}
}

useEffect(() => {
void load();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [level]);

return (
<div className="space-y-3">
<div className="flex·items-center·gap-2">
<select
value={level}
onChange={(e) => setLevel(e.target.value)}
className="rounded·border·border-slate-300·px-2·py-1·text-sm"
>
<option value="">All·levels</option>
<option value="debug">debug</option>
<option value="info">info</option>
<option value="warn">warn</option>
<option value="error">error</option>
<option value="fatal">fatal</option>
</select>
</div>
{loading?<p className="text-sm·text-gray-500">Loading...</p>::null}
{error?<p className="text-sm·text-red-600">{error}</p>::null}
<div className="overflow-x-auto·rounded·border·border-slate-200">
<table className="w-full·text-sm">
<thead className="bg-slate-50·text-left·text-xs·uppercase·text-slate-500">
<tr>
<th className="px-2·py-2">Timestamp</th>
<th className="px-2·py-2">Level</th>
<th className="px-2·py-2">Service</th>
<th className="px-2·py-2">Message</th>
</tr>
</thead>
<tbody>
<tbody>
<tbody>
<td className="px-2·py-2">String(log.timestamp??·")</td>
<td className="px-2·py-2">String(log.level??·")</td>
<td className="px-2·py-2">String((log.context·as·Record<string, unknown>|·undefined)?.service??·")</td>
<td className="px-2·py-2">String(log.message??·")</td>
</tbody>
</tbody>
</table>
</div>
</div>
);
}

function AlertsTab() {
const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string|·null>(null);

async function load() {
setLoading(true);
setError(null);
try {
const result = await adminApi.monitoringAlerts({page:·1, limit:·50});
setAlerts(result.items);
} catch (e) {
setError((e as Error).message);
} finally {
setLoading(false);
}
}

useEffect(() => {
void load();
}, []);

return (
  <div className="space-y-3">
    {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
    {error ? <p className="text-sm text-red-600">{error}</p> : null}
    <div className="overflow-x-auto rounded-border border-border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-2 py-2">Alert</th>
            <th className="px-2 py-2">Severity</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Fired</th>
            <th className="px-2 py-2"/>
          </tr>
        </thead>
        <tbody>
          <tr key={idx}>
            <td className="px-2 py-2">{String(alert.title ?? "")}</td>
            <td className="px-2 py-2">{String(alert.severity ?? "")}</td>
            <td className="px-2 py-2">{String(alert.status ?? "")}</td>
            <td className="px-2 py-2 text-xs text-slate-500">{String(alert.firedAt ?? "")}</td>
            <td className="px-2 py-2 text-right">
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  className="rounded-border border-border-slate-300 px-2 py-1 text-xs"
                  onClick={() => {
                    void adminApi.monitoringAcknowledgeAlert(String(alert.alertId ?? ""), "Acknowledged from UI").then(load);
                  }}
                >
                  Ack
                  </button>
                  <button
                  type="button"
                  className="rounded-border border-emerald-300 px-2 py-1 text-xs text-emerald-700"
                  onClick={() => {
                    void adminApi.monitoringResolveAlert(String(alert.alertId ?? ""), "Resolved from UI").then(load);
                  }}
                >
                  Resolve
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthChecksTab() {
  const [checks, setChecks] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>|null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.monitoringHealthChecks();
      setChecks(result);
    } catch(e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void adminApi.monitoringRunAllHealthChecks().then(load)}
          className="rounded-border border-border-slate-300 px-3 py-1.5 text-xs"
        >
          Run All Checks
        </button>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => (
          <div key={String(check.checkId)} className="rounded-border border-border-slate-200 bg-white p-3">
            <p className="text-sm font-sembold text-slate-900">{String(check.name ?? check.checkId)}</p>
            <p className="mt-1 text-xs text-slate-500">Status: {String(check.currentStatus ?? "unknown")}</p>
            <p className="text-xs text-slate-500">Last check: {String(check.lastCheckAt ?? "never")}</p>
          </p>
          <button
            type="button"
            onClick={() => void adminApi.monitoringRunHealthCheck(String(check.checkId)).then(load)}
            className="mt-2 rounded-border border-border-slate-300 px-2 py-1 text-xs"
          >
            Run
          </button>
        </div>
      </table>
    </div>
  );
}
function Kpi({label, value}: {label: string; value: string | number}) {
  return (
    <div className="rounded-border-border-slate-200-bg-white-p-3-shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}