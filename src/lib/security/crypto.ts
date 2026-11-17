import crypto from "node:crypto";

const DEV_EPHEMERAL_PEPPER = crypto.randomBytes(32).toString("hex");

function getOtpPepper(): string {
    const configured = process.env.OTP_SECRET || process.env.JWT_SECRET;
    if (configured && configured.length >= 32) {
        return configured;
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("Server misconfiguration: JWT_SECRET (or OTP_SECRET) must be at least 32 characters.");
    }
    return configured || DEV_EPHEMERAL_PEPPER;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP using node:crypto.
 */
export function generateNumericOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a keyed HMAC-SHA256 digest binding an OTP code to a normalized email address.
 */
export function hashOtp(email: string, otp: string): string {
    const normalizedEmail = email.trim().toLowerCase();
    return crypto
        .createHmac("sha256", getOtpPepper())
        .update(`${normalizedEmail}:${otp}`)
        .digest("hex");
}

/**
 * Verifies a candidate OTP against a stored HMAC digest in constant time.
 */
export function verifyOtpHash(email: string, otp: string, storedHash: string): boolean {
    if (!otp || !storedHash) return false;
    const candidate = Buffer.from(hashOtp(email, otp), "utf8");
    const expected = Buffer.from(storedHash, "utf8");
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
}

/**
 * Escapes HTML special characters before interpolating user-derived values into email templates.
 */
export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
