import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

import { POST } from "@/app/api/auth/verify/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/verify — expiry, lockout, and validation", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
    });

    it("rejects cross-origin requests and invalid OTP payload shapes", async () => {
        const csrfRes = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/verify", {
                origin: "https://evil.example",
                body: { email: "a@b.com", code: "123456" },
            })
        );
        expect(csrfRes.status).toBe(403);

        const badOtpRes = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/verify", {
                body: { email: "a@b.com", code: "12ab" },
            })
        );
        expect(badOtpRes.status).toBe(400);
    });

    it("deletes expired pending registrations and returns 400", async () => {
        prismaMock.pendingRegistration.findUnique.mockResolvedValue({
            id: "pr_exp",
            email: "a@b.com",
            expiresAt: new Date(Date.now() - 60_000),
            attempts: 0,
            otpHash: "0".repeat(64),
        });
        prismaMock.pendingRegistration.delete.mockResolvedValue({});

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/verify", {
                body: { email: "a@b.com", code: "123456" },
            })
        );
        expect(res.status).toBe(400);
        expect(prismaMock.pendingRegistration.delete).toHaveBeenCalledWith({
            where: { id: "pr_exp" },
        });
    });

    it("purges pending registration with 429 once max failed attempts is reached", async () => {
        prismaMock.pendingRegistration.findUnique.mockResolvedValue({
            id: "pr_lock",
            email: "a@b.com",
            expiresAt: new Date(Date.now() + 60_000),
            attempts: 5,
            otpHash: "0".repeat(64),
        });
        prismaMock.pendingRegistration.delete.mockResolvedValue({});

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/verify", {
                body: { email: "a@b.com", code: "123456" },
            })
        );
        expect(res.status).toBe(429);
        expect(prismaMock.pendingRegistration.delete).toHaveBeenCalledTimes(1);
    });
});
