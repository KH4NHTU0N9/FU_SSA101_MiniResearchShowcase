import { describe, expect, it } from "vitest";
import {
    BCRYPT_ROUNDS,
    MAX_PASSWORD_BYTES,
    MIN_PASSWORD_LENGTH,
    hashPassword,
    validatePasswordPolicy,
    verifyPassword,
} from "@/lib/security/password";

describe("security/password", () => {
    it("enforces minimum character count and 72-byte UTF-8 ceiling", () => {
        expect(validatePasswordPolicy("short")).toEqual({
            valid: false,
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        });

        const exact72 = "a".repeat(MAX_PASSWORD_BYTES);
        expect(validatePasswordPolicy(exact72)).toEqual({ valid: true });

        const multiByteOverLimit = "é".repeat(40); // 80 UTF-8 bytes
        expect(validatePasswordPolicy(multiByteOverLimit)).toEqual({
            valid: false,
            error: `Password must not exceed ${MAX_PASSWORD_BYTES} bytes.`,
        });
    });

    it("hashes passwords with configured bcrypt cost factor and verifies valid/invalid pairs", async () => {
        const hash = await hashPassword("StrongPass#2026");
        expect(hash.startsWith(`$2b$${BCRYPT_ROUNDS}$`) || hash.startsWith(`$2a$${BCRYPT_ROUNDS}$`)).toBe(true);
        await expect(verifyPassword("StrongPass#2026", hash)).resolves.toBe(true);
        await expect(verifyPassword("WrongPass#2026", hash)).resolves.toBe(false);
    });

    it("performs constant-work dummy verification and returns false when hash is missing", async () => {
        await expect(verifyPassword("AnyPassword123", null)).resolves.toBe(false);
        await expect(verifyPassword("AnyPassword123", undefined)).resolves.toBe(false);
    });
});
