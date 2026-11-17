import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/email", () => ({
    sendPasswordResetEmail: vi.fn(),
}));

import { POST } from "@/app/api/auth/forgot-password/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/forgot-password — CSRF, validation, and rate limits", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
    });

    it("enforces origin checks, email validation, and 5-per-15m IP rate limits", async () => {
        const csrf = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/forgot-password", {
                origin: "https://evil.example",
                body: { email: "a@b.com" },
            })
        );
        expect(csrf.status).toBe(403);

        const badEmail = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/forgot-password", {
                body: { email: "not-valid" },
            })
        );
        expect(badEmail.status).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(null);
        for (let i = 0; i < 5; i++) {
            await POST(
                buildJsonRequest("http://localhost:3000/api/auth/forgot-password", {
                    ip: "198.51.100.66",
                    body: { email: "user@fpt.edu.vn" },
                })
            );
        }
        const limited = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/forgot-password", {
                ip: "198.51.100.66",
                body: { email: "user@fpt.edu.vn" },
            })
        );
        expect(limited.status).toBe(429);
        expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    });
});
