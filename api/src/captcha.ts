/**
 * Simple server-side math CAPTCHA. Avoids external services.
 *
 * We sign a short-lived token (HMAC) containing the expected answer; the
 * client returns both the token and the user's typed answer. We never need
 * server-side session storage.
 */
import crypto from "node:crypto";

const SECRET = process.env.CAPTCHA_SECRET || process.env.JWT_SECRET || "captcha-dev-secret";
const TTL_MS = 10 * 60_000;

export interface CaptchaIssued {
    token: string;
    question: string;
    expiresAt: Date;
}

function sign(payload: string): string {
    return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function pick<T>(arr: T[]): T {
    return arr[crypto.randomInt(arr.length)]!;
}

export function issueCaptcha(): CaptchaIssued {
    const a = crypto.randomInt(2, 9);
    const b = crypto.randomInt(2, 9);
    const op = pick(["+", "-"]);
    const answer = op === "+" ? a + b : a - b;
    const expiresAt = new Date(Date.now() + TTL_MS);
    const payload = `${answer}|${expiresAt.getTime()}`;
    const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
    return {token, question: `What is ${a} ${op} ${b}?`, expiresAt};
}

export function verifyCaptcha(token: string, answer: string): boolean {
    if (!token || !answer) return false;
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return false;
    let payload: string;
    try {
        payload = Buffer.from(b64, "base64url").toString("utf8");
    } catch {
        return false;
    }
    if (sign(payload) !== sig) return false;
    const [expected, expiresStr] = payload.split("|");
    if (!expected || !expiresStr) return false;
    if (Date.now() > Number(expiresStr)) return false;
    return answer.trim() === expected;
}