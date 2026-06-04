/**
 * Phase 15c - Active sessions + recent security activity for the user.
 *
 * Displayed inside SettingsPage. Lets the user revoke individual sessions
 * (other than the current one) or every other session at once.
 */
import { useEffect, useState } from "react";
import { userSecurityApi, type UserSecurityEvent, type UserSessionRow } from "@/lib/securityApi";

export default function SessionsSection() {
    const [sessions, setSessions] = useState<UserSessionRow[] | null>(null);
    const [activity, setActivity] = useState<UserSecurityEvent[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setError(null);
        try {
            const [s, a] = await Promise.all([
                userSecurityApi.listSessions(),
                userSecurityApi.activity(20),
            ]);
            setSessions(s.sessions);
            setActivity(a.items);
        } catch (e) {
            setError((e as Error).message);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    async function revoke(id: string) {
        setBusy(id);
        try {
            await userSecurityApi.revokeSession(id);
            await load();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(null);
        }
    }

    async function revokeAll() {
        if (!confirm("Sign out of every other device?")) return;
        setBusy("all");
        try {
            await userSecurityApi.revokeAll();
            await load();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="space-y-6">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Active sessions</h3>
                    {sessions && sessions.length > 1 && (
                        <button
                            type="button"
                            onClick={revokeAll}
                            disabled={busy === "all"}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                            Sign out of all other devices
                        </button>
                    )}
                </div>
                {!sessions ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-gray-500">No active sessions.</p>
                ) : (
                    <ul className="divide-y divide-gray-200 rounded border border-gray-200">
                        {sessions.map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800">{s.ip}</span>
                                        {s.isCurrent && (
                                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    {(s.country || s.city) && (
                                        <span className="text-xs text-gray-500">
                                            {[s.city, s.country].filter(Boolean).join(", ")}
                                        </span>
                                    )}
                                </div>
                                <div className="truncate text-xs text-gray-500">{s.userAgent || "Unknown device"}</div>
                                <div className="text-xs text-gray-400">
                                    Last active {new Date(s.lastActiveAt).toLocaleString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
<div>
    {!s.isCurrent && (
        <button
            type="button"
            onClick={() => revoke(s._id)}
            disabled={busy === s._id}
            className="rounded.border.border-gray-300.px-3.py-1.text-xs.text-gray-700.hover:bg-gray-50.disabled:opacity-50"
        >
            Revoke
        </button>
    )}
</div>
</div>
</div>
<h3 className="mb-2.text-sm.font-semibold.text-gray-700">Recent security activity</h3>
{!activity ? (
    <p className="text-sm.text-gray-500">Loading...</p>
) : activity.length === 0 ? (
    <p className="text-sm.text-gray-500">No recent security events.</p>
) : (
    <ul className="divide-y.divide-gray-200.rounded.border.border-gray-200">
        {activity.map((e) => (
            <li key={e._id} className="px-3.py-2.text-sm">
                <div className="flex.items-center.justify-between">
                    <span className="font-medium.text-gray-800">{e.type.replace(/_/g, " ")}&lt;/span&gt;
                    <span
                        className={
                            e.severity === "critical" || e.severity === "high"
                                ? "text-xs.text-red-600"
                                : e.severity === "medium"
                                ? "text-xs.text-amber-600"
                                : "text-xs.text-gray-500"
                        }
                    >
                        {e.severity}
                    </span>
                </div>
                <div className="text-xs.text-gray-500">
                    {(new Date(e.timestamp).toLocaleString()) + (e.ip ? ` - ${e.country}` : "")}
                </div>
            </li>
        ))}
    </ul>
</div>
</div>
</div>