import axios from "axios";
import {clearPersistedAuth, readPersistedToken} from "@/lib/authPersistence";
import {getDeviceFingerprint} from "@/lib/fingerprint";

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    headers: {"Content-Type": "application/json"},
    timeout: 15_000,
});

// Cache the fingerprint after first computation so it doesn't block requests.
let fingerprintCache: string | null = null;
void getDeviceFingerprint()
    .then((fp) => {
        fingerprintCache = fp;
    })
    .catch(() => {
        /* ignore -- fingerprint is best-effort */
    });

apiClient.interceptors.request.use((config) => {
    const token = readPersistedToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (fingerprintCache) {
        config.headers["X-Device-Fingerprint"] = fingerprintCache;
    }
    const captcha = sessionStorage.getItem("upcat.captchaToken");
    if (captcha) {
        config.headers["X-Captcha-Token"] = captcha;
        // Tokens are single-use per request; clear so a stale token doesn't leak.
        sessionStorage.removeItem("upcat.captchaToken");
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearPersistedAuth();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    },
);

export default apiClient;
