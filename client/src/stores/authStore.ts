import {create} from "zustand";
import type {AuthResponse, LoginPayload, RegisterPayload, User, UserRole} from "@upcat/shared";
import {API_ROUTES} from "@upcat/shared";
import apiClient from "@/lib/api";
import {
  clearPersistedAuth,
  persistAuthSession,
  persistUserForCurrentSession,
  readPersistedToken,
  readPersistedUser,
} from "@/lib/authPersistence";

function readToken(): string | null {
  return readPersistedToken();
}

function decodeRoleFromToken(token: string | null): UserRole | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadB64 = parts[1]!
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1]!.length / 4) * 4, "=");
    const payload = JSON.parse(atob(payloadB64)) as {role?: unknown};
    return payload.role === "admin" || payload.role === "reviewee"
    ? payload.role
    : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  rememberMe: boolean;
  lastLoginResponse?: {
    onboarding?: {items: Array<{flowId: string; triggerCondition: string; reason: string}}} | null
  };
  setRememberMe: (val: boolean) => void;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
  /** Returns current role (defaults to "reviewee" when unknown). */
  role: () => UserRole;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: readPersistedUser(),
  token: readToken(),
  isAuthenticated: !!readToken(),
  isLoading: false,
  error: null,
  rememberMe: true,
  lastLoginResponse: undefined,

  setRememberMe: (val) => set({rememberMe: val}),

  login: async (payload) => {
    set({isLoading: true, error: null});
    try {
      const {data} = await apiClient.post({
        data: AuthResponse &&
        onboarding?: {items: Array<{flowId: string; triggerCondition: string; reason: string}}} | null
      });
      }>(
        API_ROUTES.AUTH.LOGIN,
        payload,
      );
      const {token, user, onboarding} = data.data;
      persistAuthSession(token, user, get().rememberMe);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        lastLoginResponse: {onboarding},
      });
    } catch (err: unknown) {
      const message =
        (err as {response?: {data?: {error?: string}}})?.response?.data
        ?.error || "Login failed";
      set({error: message, isLoading: false});
    }
  },

  register: async (payload) => {
    set({isLoading: true, error: null});
    try {
      await apiClient.post(API_ROUTES.AUTH.REGISTER, payload);
      set({isLoading: false});
    } catch (err: unknown) {
      const message =
        (err as {response?: {data?: {error?: string}}})?.response?.data
        ?.error || "Registration failed";
set({error: message, isLoading: false});
},
logout: () => {
  clearPersistedAuth();
  set({user: null, token: null, isAuthenticated: false});
},
fetchMe: async () => {
  set({isLoading: true});
  try {
    const {data} = await apiClient.get<{data: User}>(API_ROUTES.AUTH.ME);
    persistUserForCurrentSession(data.data);
    set({user: data.data, isAuthenticated: true, isLoading: false});
  } catch {
    clearPersistedAuth();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
  clearError: () => set({error: null});

  role: () => {
    const roleFromUser = get().user?.role;
    if (roleFromUser === "admin" || roleFromUser === "reviewee") return roleFromUser;
    return decodeRoleFromToken(get().token) ?? "reviewee";
  },
  isAdmin: () => get().role === "admin",
});