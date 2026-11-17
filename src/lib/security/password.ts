import bcrypt from "bcryptjs";

export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

// Precomputed valid bcrypt hash used to equalize login timing when a user record does not exist.
const DUMMY_PASSWORD_HASH = "$2b$12$rfUrH8Dtwh6.6/KwDWECjeYJ.Rw/QQMHk3ENUSCKszr6b1etMr.5.";

export interface PasswordValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Enforces minimum length and bcrypt's 72-byte UTF-8 truncation ceiling.
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return {
            valid: false,
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        };
    }

    const byteLength = Buffer.byteLength(password, "utf8");
    if (byteLength > MAX_PASSWORD_BYTES) {
        return {
            valid: false,
            error: `Password must not exceed ${MAX_PASSWORD_BYTES} bytes.`,
        };
    }

    return { valid: true };
}

/**
 * Hashes a password with the unified bcrypt cost factor.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash, or performs dummy verification when missing.
 */
export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
    if (!storedHash) {
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        return false;
    }
    return bcrypt.compare(password, storedHash);
}
