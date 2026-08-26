import * as bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export interface PasswordStrengthResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hashes a plaintext password using secure salted hashing (bcrypt 12 rounds).
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error("Password cannot be empty");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a password hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Validates password strength policy:
 * - Minimum 8 characters
 * - Contains at least one letter
 * - Contains at least one digit
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Password minimal harus 8 karakter");
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 huruf");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 angka");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
