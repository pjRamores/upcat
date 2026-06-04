/**
 * Support.ticket + identity-dispute + merge-accounts API wrappers
 * (both reviewee-facing and admin-facing).
 */
import apiclient from "@lib/api";
import {
  API_ROUTES,
  type CaptchaChallenge,
  type CreateGuestSupportTicketPayload,
  type CreateSupportTicketPayload,
  type IdentityDispute,
  type IdentityDisputeAction,
  type MergeAccountsPayload,
  type MergeAccountsResponse,
  type PostTicketMessagePayload,
  type SupportDashboardSummary,
  type SupportTicket,
  type SupportTicketMessage,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportTicketType,
  type UpdateTicketStatusPayload,
} from "@supcat/shared";

async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await p;
  return data.data;
}

/**
 * Reviewee-facing
 */
export const supportApi = {
  /**
   * List the current user's tickets.
   */
  list: () =>
    unwrap({ items: SupportTicket[] })(
      apiclient.get(API_ROUTES.SUPPORT.TICKETS),
    ),
  /**
   * Open a new ticket as an authenticated user.
   */
  create: (body: CreateSupportTicketPayload) =>
    unwrap<SupportTicket>(apiclient.post(API_ROUTES.SUPPORT.TICKETS, body)),
  get: (ticketNumber: string) =>
    unwrap<SupportTicket>(apiclient.get(API_ROUTES.SUPPORT.TICKET(ticketNumber))),
  postMessage: (ticketNumber: string, body: PostTicketMessagePayload) =>
    unwrap<SupportTicketMessage>(
      apiclient.post(API_ROUTES.SUPPORT.TICKET_MESSAGES(ticketNumber), body),
    ),
  /**
   * Guest flow (no auth).
   */
  getCaptcha: () =>
    unwrap<CaptchaChallenge>(apiclient.get(API_ROUTES.SUPPORT.CAPTCHA)),
  createGuest: (body: CreateGuestSupportTicketPayload) =>
    unwrap<{ ticketNumber: string }>(
      apiclient.post(API_ROUTES.SUPPORT.GUEST, body),
    ),
};

/**
 * Admin-facing
 */
export interface AdminTicketsListParams {
  status?: SupportTicketStatus | "";
  type?: SupportTicketType | "";
  priority?: SupportTicketPriority | "";
  assignedTo?: string;
  search?: string;
  sortBy: "updated" | "created" | "priority";
  page?: number;
  limit?: number;
}

export const adminSupportApi = {
  dashboard: () =>
    unwrap<SupportDashboardSummary>(
      apiclient.get(API_ROUTES.ADMIN.SUPPORT_DASHBOARD),
    ),
  list: (params: AdminTicketsListParams = {}) =>
    unwrap<{ items: SupportTicket[]; total: number; page: number; limit: number }>(
      apiclient.get(API_ROUTES.ADMIN.SUPPORT_TICKETS, { params }),
    ),
  get: (n: string) =>
    unwrap<SupportTicket>(apiclient.get(API_ROUTES.ADMIN.SUPPORT_TICKET(n))),
  postMessage: (n: string, body: PostTicketMessagePayload) =>
    unwrap<SupportTicketMessage>(
      apiclient.post(API_ROUTES.ADMIN.SUPPORT_TICKET_MESSAGES(n), body),
    ),
  updateStatus: (n: string, body: UpdateTicketStatusPayload) =>
    unwrap<SupportTicket>(
      apiclient.put(API_ROUTES.ADMIN.SUPPORT_TICKET_STATUS(n), body),
    ),
  verifyIdentity: (
    n: string,
    body: { method: string; status: "verified" | "failed"; notes?: string },
  ) =>
    unwrap<SupportTicket>(
      apiclient.post(API_ROUTES.ADMIN.SUPPORT_TICKET_VERIFY(n), body),
    ),
  mergeAccounts: (body: MergeAccountsPayload) =>
    unwrap<MergeAccountsResponse>(
      apiclient.post(API_ROUTES.ADMIN.SUPPORT_MERGE, body),
    ),
};
export const adminDisputesApi = {
  list: (params: { status?: string; page?: number; limit?: number } = {}) =>
    unwrap<IdentityDispute[]>({
      items: IdentityDispute[],
      total: number,
      page: number,
      limit: number,
    }) => {
      apiClient.get(API_ROUTES.ADMIN.DISPUTES, { params }),
    },
  get: (id: string) =>
    unwrap<IdentityDispute>(apiClient.get(API_ROUTES.ADMIN.DISPUTE(id))),
  create: (body: {
    supportTicketId: string;
    claimantEmail: string;
    disputedProvider: string;
    disputedProviderUserId: string;
    currentOwnerUserId: string;
  }) =>
    unwrap<IdentityDispute>(apiClient.post(API_ROUTES.ADMIN.DISPUTES, body)),
  decide: (id: string, body: { action: IdentityDisputeAction; reasoning: string }) =>
    unwrap<IdentityDispute>(apiClient.put(API_ROUTES.ADMIN.DISPUTE(id), body)),
};

export const adminDataRequestsApi = {
  list: (params: {
    type?: "export" | "deletion" | "";
    status?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) => () =>
    unwrap<({
      requests: (import("@upcat/shared").DataRequest & {
        userEmail?: string;
        userFullName?: string;
      })[];
      total: number;
      page: number;
      limit: number;
    })>(apiClient.get(API_ROUTES.ADMIN.DATA_REQUESTS, { params })),
  update: (id: string, body: { action: "cancel" | "expedite" }) =>
    unwrap<{ ok: true }>(apiClient.put(API_ROUTES.ADMIN.DATA_REQUEST(id), body)),
  deletionLog: (params: { emailHash?: string; page?: number; limit?: number } = {}) =>
    unwrap<({
      entries: import("@upcat/shared").DeletionLogEntry[];
      total: number;
      page: number;
      limit: number;
    })>(apiClient.get(API_ROUTES.ADMIN.DELETION_LOG, { params })),
};