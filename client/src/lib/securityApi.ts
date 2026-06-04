/**
 * Phase 15c - Security API wrappers (user + admin).
 */
import apiClient from "@/lib/api";
import { API_ROUTES_V15 } from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await p;
  return data.data;
}

// --- User-facing ----------------------------------------------

export interface UserSessionRow {
  id: string;
  jti: string;
  ip: string;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  issuedAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface UserSecurityEvent {
  _id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  ip: string;
  userAgent: string | null;
  country: string | null;
  details: Record<string, unknown>;
}

export const userSecurityApi = {
  listSessions: () => {
    return unwrap({ sessions: UserSessionRow[] })(
      apiClient.get(API_ROUTES_V15.ACCOUNT.SESSIONS),
    );
  },
  revokeSession: (id: string) => {
    return apiClient.post(API_ROUTES_V15.ACCOUNT.SESSION_REVOKE(id));
  },
  revokeAll: () => apiClient.post(API_ROUTES_V15.ACCOUNT.SESSIONS_REVOKE_ALL),
  activity: (limit = 20) => {
    return unwrap({ items: UserSecurityEvent[] })(
      apiClient.get(`${API_ROUTES_V15.ACCOUNT.ACTIVITY}?limit=${limit}`),
    );
  },
};

// --- Admin-facing ----------------------------------------------

export interface AdminDashboardOverview {
  activeThreats: number;
  blockedIps: number;
  securityEventsToday: number;
  avgThreatScore: number;
  systemStatus: "normal" | "elevated" | "under_attack";
  lockdown: boolean;
}

export interface AdminDashboard {
  overview: AdminDashboardOverview;
  recentEvents: Array<Record<string, unknown>>;
  topThreats: Array<Record<string, unknown>>;
  attackTimeline: Array<Record<string, unknown>>;
  geoDistribution: Array<{ _id: string; count: number }>;
}

export const adminSecurityApi = {
  dashboard: () => unwrap<AdminDashboard>(apiClient.get(API_ROUTES_V15.ADMIN.DASHBOARD)),

  listEvents: (q: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return unwrap({
      items: Array<Record<string, unknown>>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    })(apiClient.get(`${API_ROUTES_V15.ADMIN.EVENTS}?${qs}`));
  },
  getEvent: (id: string) => {
    return unwrap({
      event: Record<string, unknown>;
      related: Array<Record<string, unknown>>;
      ipIntel: Record<string, unknown> | null;
    })(apiClient.get(API_ROUTES_V15.ADMIN.EVENT(id)));
  },
  reviewEvent: (id: string, body: { notes?: string; action?: string }) => {
    apiClient.put(API_ROUTES_V15.ADMIN.EVENT_REVIEW(id), body);
  },

  listIps: (q: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return unwrap({
      items: Array<Record<string, unknown>>;
      total: number;
      page: number;
      totalPages: number;
    })(apiClient.get(`${API_ROUTES_V15.ADMIN.IPS}?${qs}`));
  },
  getIp: (ip: string) => {
    return unwrap({
      ip: Record<string, unknown>;
      related: Array<Record<string, unknown>>;
      ipIntel: Record<string, unknown> | null;
    })(apiClient.get(API_ROUTES_V15.ADMIN.IP(ip)));
  },
};
    ip: Record<string, unknown>;
    events: Array<Record<string, unknown>>;
    blocks: Array<Record<string, unknown>>;
  })>(apiClient.get(API_ROUTES_V15.ADMIN.IP(ip))),
  blockIp: (ip: string, body: { severity?: string; reason?: string; duration?: number }) => apiClient.post(API_ROUTES_V15.ADMIN.IP_BLOCK(ip), body),
  unblockIp: (ip: string) => apiClient.post(API_ROUTES_V15.ADMIN.IP_UNBLOCK(ip)),
  blockRange: (body: { cidr: string; severity?: string; reason?: string; duration?: number }) => apiClient.post(API_ROUTES_V15.ADMIN.IP_BLOCK_RANGE, body),
  listBlocked: (q: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v) qs.set(k, v);
    return unwrap<items: Array<Record<string, unknown>>; total: number>[]>(apiClient.get(`${API_ROUTES_V15.ADMIN.BLOCKED}?${qs}`));
  },
  addBlock: (body: {
    type: string;
    value: string;
    severity?: string;
    reason?: string;
    expiresAt?: string | null;
  }) => apiClient.post(API_ROUTES_V15.ADMIN.BLOCKED, body),
  removeBlock: (id: string) => apiClient.delete(API_ROUTES_V15.ADMIN.BLOCKED_ITEM(id)),
  getConfig: () => unwrap<Record<string, unknown>>(apiClient.get(API_ROUTES_V15.ADMIN.CONFIG)),
  updateConfig: (config: Record<string, unknown>, password: string) => unwrap<Record<string, unknown>>(apiClient.put(API_ROUTES_V15.ADMIN.CONFIG, {config, password}),
  enableLockdown: (password: string) => apiClient.post(API_ROUTES_V15.ADMIN.LOCKDOWN_ENABLE, {confirmCode: "LOCKDOWN", password}),
  disableLockdown: (password: string) => apiClient.post(API_ROUTES_V15.ADMIN.LOCKDOWN_DISABLE, {password}),
  report: (period: "24h" | "7d" | "30d" | "24h") => unwrap<{
    period: string;
    since: string;
    totalEvents: number;
    newBlocks: number;
    byType: Array<{_id: string; count: number}>;
    bySeverity: Array<{_id: string; count: number}>;
    topCountries: Array<{_id: string; count: number}>;
    topIps: Array<{_id: string; count: number}>;
    recommendations: string[];
  }>(apiClient.get(`${API_ROUTES_V15.ADMIN.REPORTS}?period=${period}`)),
});