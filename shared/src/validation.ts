import { PASSWORD_RULES } from "./constants.js";
import type { PasswordStrength, PasswordValidation } from "./types.js";

export function validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < PASSWORD_RULES.minLength) {
        errors.push(`At least ${PASSWORD_RULES.minLength} characters`);
    }
    if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push("At least one uppercase letter");
    }
    if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
        errors.push("At least one lowercase letter");
    }
    if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
        errors.push("At least one number");
    }
    if (PASSWORD_RULES.requireSpecial && !/[^\u0021\u0024\u0026\u0028\u0029\u003a-\u005b\u005d\u005e\u007f-\uffff]/.test(password)) {
        errors.push("At least one special character");
    }

    let strength: PasswordStrength = "weak";
    const passed = 5 - errors.length;
    if (passed >= 5 && password.length >= 12) {
        strength = "strong";
    } else if (passed >= 4) {
        strength = "medium";
    } else if (passed >= 3) {
        strength = "weak";
    }

    return { isValid: errors.length === 0, strength, errors };
}

export function validateEmail(email: string): boolean {
    return /^[^@\s]+@[^\s@]+\.[^\s@]+$/.test(email);
}