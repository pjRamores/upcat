/**
 * Account-recovery helpers: code generation/verification, security questions,
 * and recovery-scoped JWT issuance.
 */
import crypto from "node:crypto";
import * as bcrypt from "@node-rs/bcrypt";
import jwt from "jsonwebtoken";
import { type Db, ObjectId, type WithId } from "mongodb";
import {
    RECOVERY_CODE_ALPHABET,
    RECOVERY_CODE_COUNT,
    RECOVERY_TOKEN_TTL_SECONDS,
    SECURITY_QUESTIONS_REQUIRED,
} from "@upcat/shared";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface RecoveryJwtPayload {
    userId: string;
    email: string;
    scope: "recovery";
    iat?: number;
    exp?: number;
}

export interface RecoveryCodeEntry {
    code: string; // bcrypt.hash
    usedAt: Date | null;
}

export interface RecoveryCodesDoc {
    _id: ObjectId;
    userId: ObjectId;
    codes: RecoveryCodeEntry[];
    generatedAt: Date;
    generatedBy: "user" | "admin";
    version: number;
}

/**
 * Random 12-char block code in groups of 4: XXXX-XXXX-XXXX.
 */
export function generatePlainRecoveryCode(): string {
    const bytes = crypto.randomBytes(12);
    const chars = Array.from(bytes).map(
        (b) => RECOVERY_CODE_ALPHABET[b % RECOVERY_CODE_ALPHABET.length]!
    );
    return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export function generatePlainRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, generatePlainRecoveryCode);
}

export async function hashRecoveryCodes(plain: string[]): Promise<RecoveryCodeEntry[]> {
    return Promise.all(
        plain.map(async (code) => ({
            code: await bcrypt.hash(normalizeCode(code), 10),
            usedAt: null,
        }))
    );
}

/**
 * Normalize input for comparison -- uppercase, strip dashes and whitespace.
 */
export function normalizeCode(input: string): string {
    return input.toUpperCase().replace(/[\s-]+/g, "");
}

export async function consumeRecoveryCode(
    db: Db,
    userId: ObjectId,
    submitted: string,
): Promise<boolean> {
    const doc = await db.collection<RecoveryCodesDoc>("recovery_codes").findOne({ userId });
    if (!doc) return false;

    const normalized = normalizeCode(submitted);
    for (let i = 0; i < doc.codes.length; i++) {
        const entry = doc.codes[i]!;
        if (entry.usedAt) continue;
        // bcrypt.compare returns true only for the matching hash.
        // We hash the "normalized" candidate against each stored hash.
        // (Stored hashes were created over normalized codes.)
        const ok = await bcrypt.compare(normalized, entry.code);
        if (ok) {
            await db.collection<RecoveryCodesDoc>("recovery_codes").updateOne(
                { _id: doc._id },
                {$set: {[`codes.${i}.usedAt`]: new Date()}},
            );
            return true;
        }
    }
    return false;
}

export async function countUnusedRecoveryCodes(
    db: Db,
    userId: ObjectId,
): Promise<{ total: number; unused: number; generatedAt: Date | null }> {
    const doc = await db.collection<RecoveryCodesDoc>("recovery_codes").findOne({ userId });
    if (!doc) return { total: 0, unused: 0, generatedAt: null };
return {
    total: doc.codes.length,
    unused: doc.codes.filter((c) => !c.usedAt).length,
    generatedAt: doc.generatedAt,
};
}

// --- Security questions ---
export interface StoredSecurityQuestion {
    question: string;
    answerHash: string;
}

export function normalizeAnswer(answer: string): string {
    return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function hashSecurityAnswers(
    entries: { question: string; answer: string }[]
): Promise<StoredSecurityQuestion[]> {
    if (entries.length !== SECURITY_QUESTIONS_REQUIRED) {
        throw new Error(`Exactly ${SECURITY_QUESTIONS_REQUIRED} security questions are required.`);
    }
    return Promise.all(
        entries.map(async (e) => ({
            question: e.question,
            answerHash: await bcrypt.hash(normalizeAnswer(e.answer), 10),
        }))
    );
}

export async function verifySecurityAnswers(
    stored: StoredSecurityQuestion[],
    submitted: { questionIndex: number; answer: string }[]
): Promise<boolean> {
    if (submitted.length !== stored.length) return false;
    // Require an answer for *each* stored question, irrespective of order.
    const seen = new Set<number>();
    for (const s of submitted) {
        if (s.questionIndex < 0 || s.questionIndex >= stored.length) return false;
        if (seen.has(s.questionIndex)) return false;
        seen.add(s.questionIndex);
        // eslint-disable-next-line no-await-in-loop
        const ok = await bcrypt.verify(normalizeAnswer(s.answer), stored[s.questionIndex]!.answerHash);
        if (!ok) return false;
    }
    return seen.size === stored.length;
}

// --- Recovery JWT ---
export function signRecoveryToken(user: { _id: ObjectId; email: string }): string {
    return jwt.sign(
        { userId: user._id.toString(), email: user.email, scope: "recovery" },
        JWT_SECRET,
        { expiresIn: RECOVERY_TOKEN_TTL_SECONDS },
    );
}

export function verifyRecoveryToken(token: string): RecoveryJwtPayload {
    const decoded = jwt.verify(token, JWT_SECRET) as RecoveryJwtPayload;
    if (decoded.scope !== "recovery") {
        throw new Error("Invalid token scope");
    }
    return decoded;
}

export function tryGetUserSecurity(user: WithId<Record<string, unknown>>): {
    hasRecoveryCodes: boolean;
    recoveryCodesGeneratedAt: Date | null;
    hasSecurityQuestions: boolean;
    lastPasswordChangeAt: Date | null;
    lockedUntil: Date | null;
    loginAttempts: number;
} {
    const sec = (user.security ?? () as {
        hasRecoveryCodes?: boolean;
        recoveryCodesGeneratedAt?: Date | null;
        securityQuestions?: StoredSecurityQuestion[] | null;
        lastPasswordChangeAt?: Date | null;
        loginAttempts?: { count?: number; lockedUntil?: Date | null };
    });
    return {
        hasRecoveryCodes: !!sec.hasRecoveryCodes,
        recoveryCodesGeneratedAt: sec.recoveryCodesGeneratedAt ?? null,
        hasSecurityQuestions: Array.isArray(sec.securityQuestions) && sec.securityQuestions.length > 0,
        lastPasswordChangeAt: sec.lastPasswordChangeAt ?? null,
        lockedUntil: sec.loginAttempts?.lockedUntil ?? null,
        loginAttempts: sec.loginAttempts?.count ?? 0,
    };
}