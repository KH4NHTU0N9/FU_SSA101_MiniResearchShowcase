import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

import { POST } from "@/app/api/auth/reset-password/route";
import { hashOtp, resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/reset-password — expiry, attempts, and origin checks", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        vi.stubEnv("JWT_SECRET", "reset-val-test-secret-minimum-32-chars");
    });

    it("rejects cross-origin CSRF requests and expired reset tokens", async () => {
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/auth/reset-password", {
                        origin: "https://attacker.com",
                        body: { email: "a@b.com", code: "123456", newPassword: "Password123!" },
                    })
                )
            ).status
        ).toBe(403);

        prismaMock.user.findUnique.mockResolvedValue({
            id: "u1",
            resetCode: hashOtp("a@b.com", "123456"),
            resetAttempts: 0,
            resetCodeExpires: new Date(Date.now() - 10_000),
        });
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/auth/reset-password", {
                        body: { email: "a@b.com", code: "123456", newPassword: "Password123!" },
                    })
                )
            ).status
        ).toBe(400);
    });

    it("wipes reset state and returns 429 on max failed reset attempts", async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: "u1",
            resetCode: hashOtp("a@b.com", "123456"),
            resetAttempts: 5,
            resetCodeExpires: new Date(Date.now() + 60_000),
        });
        prismaMock.user.update.mockResolvedValue({});

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/reset-password", {
                body: { email: "a@b.com", code: "123456", newPassword: "Password123!" },
            })
        );
        expect(res.status).toBe(429);
        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { resetCode: null, resetAttempts: 0, resetCodeExpires: null },
        });
    });
});
