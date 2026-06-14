import type { User } from "@upcat/shared";

const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "upcat.auth.user";

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function localToken(): string | null {
  return getLocalStorage()?.getItem(TOKEN_STORAGE_KEY) ?? null;
}

function sessionToken(): string | null {
  return getSessionStorage()?.getItem(TOKEN_STORAGE_KEY) ?? null;
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<User>;

  return (
    typeof candidate._id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.firstName === "string" &&
    typeof candidate.lastName === "string" &&
    (candidate.role === "admin" || candidate.role === "reviewee")
  );
}

export function readPersistedToken(): string | null {
  return localToken() || sessionToken();
}

export function getActiveAuthStorage(): Storage | null {
  const local = getLocalStorage();
  const session = getSessionStorage();

  if (local?.getItem(TOKEN_STORAGE_KEY)) return local;
  if (session?.getItem(TOKEN_STORAGE_KEY)) return session;

  return null;
}

export function readPersistedUser(): User | null {
  const storage = getActiveAuthStorage();
  if (!storage) return null;

  const raw = storage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isUser(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed persisted user payloads.
  }

  storage.removeItem(USER_STORAGE_KEY);
  return null;
}

export function persistAuthSession(
  token: string,
  user: User,
  rememberMe: boolean
): void {
  const local = getLocalStorage();
  const session = getSessionStorage();

  const storage = rememberMe ? local : session;
  const otherStorage = rememberMe ? session : local;

  otherStorage?.removeItem(TOKEN_STORAGE_KEY);
  otherStorage?.removeItem(USER_STORAGE_KEY);

  if (!storage) return;

  storage.setItem(TOKEN_STORAGE_KEY, token);
  storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function persistUserForCurrentSession(user: User): void {
  const storage = getActiveAuthStorage();
  if (!storage) return;

  storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearPersistedAuth(): void {
  const local = getLocalStorage();
  const session = getSessionStorage();

  local?.removeItem(TOKEN_STORAGE_KEY);
  local?.removeItem(USER_STORAGE_KEY);
  session?.removeItem(TOKEN_STORAGE_KEY);
  session?.removeItem(USER_STORAGE_KEY);
}
