/**
 * /admin/support -- support team overview dashboard.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  SUPPORT_TICKET_PRIORITY_META,
  SUPPORT_TICKET_STATUS_META,
  SUPPORT_TICKET_TYPE_META,
  type SupportDashboardSummary,
} from "@upcat/shared";
import { adminSupportApi } from "@/lib/supportApi";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

export default function AdminSupportDashboardPage() {
  const [data, setData] = useState<SupportDashboardSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminSupportApi
      .dashboard()
      .then(setData)
      .catch(() => setErr("Could not load dashboard."));
  }, []);

  if (err) return <p className="p-6 text-sm text-red-700">{err}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Seo title="Support dashboard" noindex />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Open" value={data.open} accent="blue" />
        <Kpi label="In-progress" value={data.inProgress} accent="amber" />
        <Kpi label="Awaiting user" value={data.awaitingUser} accent="purple" />
        <Kpi label="Unassigned" value={data.unassigned} accent="slate" />
        <Kpi label="Today" value={data.ticketsToday} accent="emerald" />
        <Kpi label="Avg resolution" value={`${data.avgResolutionHours.toFixed(1)}h`} accent="indigo" />
      </div>

      {/* Oldest open + breakdowns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Oldest open ticket">
          {data.oldestOpenTicket ? (
            <Link to={`/admin/support/tickets/${data.oldestOpenTicket.ticketNumber}`}>
              <p className="font-mono text-xs text-amber-700">{data.oldestOpenTicket.ticketNumber}</p>
              <p className="font-semibold text-amber-900">{data.oldestOpenTicket.subject}</p>
              <p className="mt-1 text-xs text-amber-700">Opened {new Date(data.oldestOpenTicket.createdAt).toLocaleDateString()}</p>
            </Link>
          ) : (
            <p className="text-sm text-gray-500">No open tickets - nice work!</p>
          )}
        </Panel>

        <Panel title="By type">
          <ul className="space-y-1 text-sm">
            {Object.entries(data.byType).map(([t, n]) => (
              <li key={t} className="flex justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold bg-${SUPPORT_TICKET_TYPE_META[t as keyof typeof SUPPORT_TICKET_TYPE_META]?.icon}-50 text-${SUPPORT_TICKET_TYPE_META[t as keyof typeof SUPPORT_TICKET_TYPE_META]?.label ?? t}`} />
                <span className="font-mono text-gray-700">{n}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="By priority">
          <ul className="space-y-1 text-sm">
            {Object.entries(data.byPriority).map(([p, n]) => (
              <li key={p} className="flex justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold bg-${SUPPORT_TICKET_PRIORITY_META[p as keyof typeof SUPPORT_TICKET_PRIORITY_META]?.color}-50 text-${SUPPORT_TICKET_PRIORITY_META[p as keyof typeof SUPPORT_TICKET_PRIORITY_META]?.label ?? p}`} />
                <span className="font-mono text-gray-700">{n}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
</span>
            <span className="font-mono text-gray-700">{n}</span>
        );
    });
    </ul>
    </Panel>
</div>

{/* 30-day trend (simple table) */}
<Panel title="Last 30 days.-- opened vs. resolved">
    <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
            <thead>
                <tr className="text-left text-gray-500">
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Opened</th>
                    <th className="py-1">Resolved</th>
                </tr>
            </thead>
            <tbody>
                {data.resolutionTrend.map((d) => (
                    <tr key={d.date} className="border-t border-gray-100">
                        <td className="py-1 pr-3 font-mono text-gray-700">{d.date}</td>
                        <td className="py-1 pr-3 text-primary-700">{d.opened}</td>
                        <td className="py-1 text-emerald-700">{d.resolved}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</Panel>

{/* Recent feed */}
<Panel title="Recent activity">
    <ul className="divide-y divide-gray-100">
        {data.recent.map((t) => {
            const status = SUPPORT_TICKET_STATUS_META[t.status];
            return (
                <li key={t._id}>
                    <Link
                        to={`/admin/support/tickets/${t.ticketNumber}`}
                        className="flex items-start justify-between gap-3 px-1 py-2 hover:bg-gray-50"
                    >
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                                {t.ticketNumber}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {SUPPORT_TICKET_TYPE_META[t.type]?.label} - {new Date(t.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-${status.color}-50 text-${status.color}-700`}
                        >
                            {status.label}
                        </span>
                    </Link>
                </li>
            );
        })}
    </ul>
</Panel>
</div>
);

function Kpi({
    label,
    value,
    accent,
}: {
    label: string;
    value: number | string;
    accent: string;
}) {
    return (
        <div className={`rounded-xl border border-${accent}-200 bg-${accent}-50 p-4 shadow-sm`}>
            <p className={`text-xs font-semibold uppercase tracking-wide text-${accent}-700`}>
                {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function Panel({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">{title}</h2>
            {children}
        </section>
    );
}