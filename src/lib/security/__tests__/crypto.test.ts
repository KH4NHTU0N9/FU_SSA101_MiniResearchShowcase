import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    escapeHtml,
    generateNumericOtp,
    hashOtp,
    verifyOtpHash,
} from "@/lib/security/crypto";

describe("security/crypto", () => {
    beforeEach(() => {
        vi.stubEnv("JWT_SECRET", "a-very-strong-test-secret-key-at-least-32-chars");
        vi.stubEnv("OTP_SECRET", "");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("generates uniform 6-digit numeric OTP strings between 100000 and 999999", () => {
        for (let i = 0; i < 25; i++) {
            const otp = generateNumericOtp();
            expect(otp).toMatch(/^\d{6}$/);
            const num = Number(otp);
            expect(num).toBeGreaterThanOrEqual(100000);
            expect(num).toBeLessThanOrEqual(999999);
        }
    });

    it("hashes and verifies OTP bound case-insensitively to normalized email", () => {
        const digest = hashOtp("  Student@FPT.EDU.VN ", "482913");
        expect(digest).toMatch(/^[a-f0-9]{64}$/);
        expect(verifyOtpHash("student@fpt.edu.vn", "482913", digest)).toBe(true);
    });

    it("rejects mismatched OTP, mismatched email, empty inputs, or corrupted hex digests", () => {
        const digest = hashOtp("student@fpt.edu.vn", "482913");
        expect(verifyOtpHash("student@fpt.edu.vn", "000000", digest)).toBe(false);
        expect(verifyOtpHash("other@fpt.edu.vn", "482913", digest)).toBe(false);
        expect(verifyOtpHash("student@fpt.edu.vn", "", digest)).toBe(false);
        expect(verifyOtpHash("student@fpt.edu.vn", "482913", "short")).toBe(false);
    });

    it("throws in production if JWT_SECRET and OTP_SECRET are missing or short", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("JWT_SECRET", "short");
        vi.stubEnv("OTP_SECRET", "");
        expect(() => hashOtp("a@b.com", "123456")).toThrow(/Server misconfiguration/);
    });

    it("escapes HTML special characters against XSS injection", () => {
        expect(escapeHtml(`<script>alert("x&y'z")</script>`)).toBe(
            "&lt;script&gt;alert(&quot;x&amp;y&#39;z&quot;)&lt;/script&gt;"
        );
    });
});
