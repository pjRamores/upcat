import type {User} from "@upcat/shared";

const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "upcat.auth.user";

function localToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function sessionToken(): string | null {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function readPersistedToken(): string | null {
    return localToken() || sessionToken();
}

export function getActiveAuthStorage(): Storage | null {
    if (localToken()) return localStorage;
    if (sessionToken()) return sessionStorage;
    return null;
}

export function readPersistedUser(): User | null {
    const storage = getActiveAuthStorage();
    if (!storage) return null;

    const raw = storage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<User>;
        if (
            typeof parsed.id === "string" &&
            typeof parsed.email === "string" &&
            typeof parsed.firstName === "string" &&
            typeof parsed.lastName === "string" &&
            (parsed.role === "admin" || parsed.role === "reviewee")
        ) {
            return parsed as User;
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
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    otherStorage.removeItem(TOKEN_STORAGE_KEY);
    otherStorage.removeItem(USER_STORAGE_KEY);
    storage.setItem(TOKEN_STORAGE_KEY, token);
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function persistUserForCurrentSession(user: User): void {
    const storage = getActiveAuthStorage();
    if (!storage) return;
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearPersistedAuth(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
}