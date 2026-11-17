import { afterEach, describe, expect, it } from "vitest";
import {
    checkRateLimit,
    getClientIp,
    resetRateLimitStore,
} from "@/lib/security/rate-limit";

describe("security/rate-limit", () => {
    afterEach(() => {
        resetRateLimitStore();
    });

    it("extracts client IP from x-forwarded-for or x-real-ip headers", () => {
        const reqForwarded = new Request("http://localhost/api/test", {
            headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1", "x-real-ip": "10.0.0.2" },
        });
        expect(getClientIp(reqForwarded)).toBe("198.51.100.1");

        const reqRealIp = new Request("http://localhost/api/test", {
            headers: { "x-real-ip": "203.0.113.55" },
        });
        expect(getClientIp(reqRealIp)).toBe("203.0.113.55");

        const reqUnknown = new Request("http://localhost/api/test");
        expect(getClientIp(reqUnknown)).toBe("unknown");
    });

    it("allows requests within quota and blocks subsequent requests until sliding window expires", () => {
        const config = { windowMs: 60_000, maxRequests: 2 };
        const t0 = 1_000_000;

        expect(checkRateLimit("login", "1.2.3.4", config, t0)).toEqual({
            allowed: true,
            remaining: 1,
            retryAfterSeconds: 0,
        });
        expect(checkRateLimit("login", "1.2.3.4", config, t0 + 10_000)).toEqual({
            allowed: true,
            remaining: 0,
            retryAfterSeconds: 0,
        });

        const blocked = checkRateLimit("login", "1.2.3.4", config, t0 + 20_000);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
        expect(blocked.retryAfterSeconds).toBe(40);

        const expired = checkRateLimit("login", "1.2.3.4", config, t0 + 70_001);
        expect(expired.allowed).toBe(true);
        expect(expired.remaining).toBe(1);
    });

    it("isolates buckets across namespaces and supports scoped reset", () => {
        const config = { windowMs: 60_000, maxRequests: 1 };
        expect(checkRateLimit("nsA", "user1", config, 100).allowed).toBe(true);
        expect(checkRateLimit("nsA", "user1", config, 200).allowed).toBe(false);
        expect(checkRateLimit("nsB", "user1", config, 200).allowed).toBe(true);

        resetRateLimitStore("nsA");
        expect(checkRateLimit("nsA", "user1", config, 300).allowed).toBe(true);
    });
});
