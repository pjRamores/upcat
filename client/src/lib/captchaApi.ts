/**
 * Phase 15b -- CAPTCHA API wrappers.
 */
import apiClient from "@/lib/api";
import {
    API_ROUTES_V15,
    type CaptchaChallengePayload,
    type CaptchaType,
    type CaptchaVerifyResponse,
} from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { [key: string]: T } }>): Promise<T> {
    const { data } = await p;
    return data.data;
}

export const captchaApi = {
    generate: (type?: CaptchaType, elevated = false) => {
        return unwrap<CaptchaChallengePayload>(
            apiClient.post(API_ROUTES_V15.CAPTCHA.GENERATE, { type, elevated })
        );
    },
    verify: (captchaId: string, answer: unknown, elapsedMs?: number) => {
        return unwrap<CaptchaVerifyResponse>(
            apiClient.post(API_ROUTES_V15.CAPTCHA.VERIFY, { captchaId, answer, elapsedMs })
        );
    },
};

/**
 * Stores a verified CAPTCHA token so the next outgoing request includes
 * it via the apiClient interceptor ('X-Captcha-Token').
 */
export function armCaptchaToken(token: string): void {
    try {
        sessionStorage.setItem("upcat.captchaToken", token);
    } catch {
        /* sessionStorage may be unavailable -- caller should pass token manually */
    }
}