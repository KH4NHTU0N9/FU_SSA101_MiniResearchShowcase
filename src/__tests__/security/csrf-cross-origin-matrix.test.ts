import { describe, expect, it, vi } from "vitest";
import { guardOrigin } from "@/lib/api/response";
import { validateOrigin } from "@/lib/security/csrf";
import { buildJsonRequest, buildRawRequest } from "@/test/mocks/next";

describe("security/csrf-cross-origin-matrix", () => {
    it("allows safe HTTP methods regardless of cross-site fetch metadata", () => {
        for (const method of ["GET", "HEAD", "OPTIONS"]) {
            const req = buildRawRequest("https://app.example.com/api/community", {
                method,
                headers: {
                    "sec-fetch-site": "cross-site",
                    origin: "https://attacker.example",
                },
            });
            expect(validateOrigin(req)).toBe(true);
        }
    });

    it("rejects cross-site, null-origin, mismatched-origin, and spoofed-referer mutations", () => {
        const attacks: Array<{
            label: string;
            origin: string | null;
            headers?: Record<string, string>;
        }> = [
            {
                label: "sec-fetch-site cross-site",
                origin: "https://app.example.com",
                headers: { "sec-fetch-site": "cross-site" },
            },
            {
                label: "null origin sandbox",
                origin: "null",
            },
            {
                label: "foreign origin header",
                origin: "https://evil.example",
            },
            {
                label: "foreign referer without origin",
                origin: null,
                headers: { referer: "https://evil.example/csrf.html" },
            },
        ];

        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            for (const attack of attacks) {
                const req = buildJsonRequest("https://app.example.com/api/assessment", {
                    method,
                    host: "app.example.com",
                    origin: attack.origin,
                    headers: attack.headers,
                    body: {},
                });
                expect(validateOrigin(req), `${method} - ${attack.label}`).toBe(false);
                const blocked = guardOrigin(req);
                expect(blocked?.status).toBe(403);
            }
        }
    });

    it("respects forwarded hosts and NEXT_PUBLIC_APP_URL behind reverse proxies", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://portal.fpt.edu.vn");
        try {
            const req = buildJsonRequest("http://127.0.0.1:3000/api/auth/login", {
                method: "POST",
                host: "127.0.0.1:3000",
                origin: "https://portal.fpt.edu.vn",
                body: {},
            });
            expect(validateOrigin(req)).toBe(true);
            expect(guardOrigin(req)).toBeNull();
        } finally {
            vi.unstubAllEnvs();
        }
    });
});
