/**
 * Public + authenticated API helpers for social login, account linking,
 * password setup, and account deletion.
 */
import apiClient from "@/lib/api";
import { loadStaticAuthProviders } from "@/lib/staticAuthProviders";
import {
  API_ROUTES,
  SOCIAL_PROVIDERS,
  type AuthResponse,
  type LinkedAccount,
  type PublicAuthProviders,
  type SocialCallbackLinkResponse,
  type SocialProvider,
  type SocialStartResponse,
} from "@upcat/shared";

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

function hasUsableStaticAuthProvider(
  snapshot: { providers?: PublicAuthProviders | null } | null | undefined,
): snapshot is { providers: PublicAuthProviders } {
  return !!snapshot?.providers;
}

export const oidcApi = {
  /** Public - used by Login/Register to render only enabled buttons. */
  providers: async (): Promise<PublicAuthProviders> => {
    const snapshot = await loadStaticAuthProviders();

    if (hasUsableStaticAuthProvider(snapshot)) {
      return snapshot.providers;
    }

    return SOCIAL_PROVIDERS.reduce((acc, provider) => {
      acc[provider] = { enabled: false };
      return acc;
    }, {} as PublicAuthProviders);
  },

  /** Begin a social flow; returns the URL the SPA should redirect to. */
  start: (
    provider: SocialProvider,
    body: { purpose: "login" | "link"; redirectPath?: string },
  ) =>
    unwrap<SocialStartResponse>(
      apiClient.post(API_ROUTES.AUTH.SOCIAL_START(provider), body),
    ),

  /** Complete a social flow with the IdP-provided code + state. */
  callback: (
    provider: SocialProvider,
    body: { code: string; state: string },
  ) =>
    unwrap<
      | (AuthResponse & {
          linkedProvider: SocialProvider;
          newAccount: boolean;
          redirectPath: string | null;
        })
      | SocialCallbackLinkResponse
    >(apiClient.post(API_ROUTES.AUTH.SOCIAL_CALLBACK(provider), body)),

  /** Auth required - list providers linked to the current user. */
  linkedAccounts: () =>
    unwrap<{ accounts: LinkedAccount[]; hasPassword: boolean }>(
      apiClient.get(API_ROUTES.AUTH.LINKED_ACCOUNTS),
    ),

  /** Auth required - remove a linked provider. */
  unlink: (provider: SocialProvider) =>
    unwrap<{ unlinked: true; provider: SocialProvider }>(
      apiClient.post(API_ROUTES.AUTH.UNLINK, { provider }),
    ),

  /** Auth required - set or change the local password. */
  setPassword: (body: {
    newPassword: string;
    confirmPassword: string;
    currentPassword?: string;
  }) => unwrap<{ ok: true }>(apiClient.post(API_ROUTES.AUTH.SET_PASSWORD, body)),

  /** Auth required - permanently delete the current user's account. */
  deleteAccount: (body: { confirmation: string; password?: string }) =>
    unwrap<{ deleted: true }>(
      apiClient.delete(API_ROUTES.ACCOUNT, { data: body }),
    ),
};
