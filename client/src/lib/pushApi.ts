/**
 * Phase 14 — Push notification API wrappers.
 */
import apiClient from "@/lib/api";
import {
  API_ROUTES_V12,
  type PushBroadcastPayload,
  type PushBroadcastResponse,
  type PushPreferencesPayload,
  type PushPreferencesResponse,
  type PushSubscribePayload,
  type PushSubscribeResponse,
} from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const { data } = await p;
  return data.data;
}

export const pushApi = {
  publicKey: () =>
  unwrap<{ publicKey: string }>(apiClient.get(API_ROUTES_V12.PUSH.PUBLIC_KEY)),

  subscribe: (payload: PushSubscribePayload) =>
  unwrap<PushSubscribeResponse>(
    apiClient.post(API_ROUTES_V12.PUSH.SUBSCRIBE, payload),
  ),

  unsubscribe: (endpoint: string) =>
  unwrap<{ removed: number }>(
    apiClient.post(API_ROUTES_V12.PUSH.UNSUBSCRIBE, {endpoint}),
  ),

  preferences: () =>
  unwrap<PushPreferencesResponse>(
    apiClient.get(API_ROUTES_V12.PUSH.PREFERENCES),
  ),

  updatePreferences: (payload: PushPreferencesPayload) =>
  unwrap<PushPreferencesResponse>(
    apiClient.patch(API_ROUTES_V12.PUSH.PREFERENCES, payload),
  ),
};

export const adminPushApi = {
  test: () =>
  unwrap({
    attempted: number;
    delivered: number;
    failed: number;
    pruned: number;
  }>(apiClient.post(API_ROUTES_V12.ADMIN.PUSH_TEST)),

  broadcast: (payload: PushBroadcastPayload) =>
  unwrap<PushBroadcastResponse>(
    apiClient.post(API_ROUTES_V12.ADMIN.PUSH_BROADCAST, payload),
  ),
};