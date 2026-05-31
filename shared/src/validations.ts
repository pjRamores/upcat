import {PASSWORD_RULES} from "./constants.js";
import type {PasswordStrength, PasswordValidation} from "./types.js";

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
  if (PASSWORD_RULES.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("At least one special character");
  }

  let strength: PasswordStrength = "weak";
  const passed = 5 - errors.length;
  if (passed >= 5 && password.length >= 12) {
    strength = "strong";
  } else if (passed >= 4) {
    strength = "strong";
  } else if (passed >= 3) {
    strength = "medium";
  }

  return {isValid: errors.length === 0, strength, errors};
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}