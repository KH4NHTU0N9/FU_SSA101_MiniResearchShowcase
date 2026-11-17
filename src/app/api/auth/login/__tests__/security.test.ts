import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { setSessionMock, verifyPasswordMock } = vi.hoisted(() => ({
    setSessionMock: vi.fn(),
    verifyPasswordMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    setSession: setSessionMock,
}));

vi.mock("@/lib/security", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/security")>();
    return {
        ...actual,
        verifyPassword: verifyPasswordMock,
    };
});

import { POST } from "@/app/api/auth/login/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/login — security & rate limits", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        setSessionMock.mockReset();
        verifyPasswordMock.mockReset();
    });

    it("blocks cross-origin POST requests with 403", async () => {
        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/login", {
                origin: "https://phishing.test",
                body: { identifier: "a@b.com", password: "secret" },
            })
        );
        expect(res.status).toBe(403);
    });

    it("always invokes verifyPassword even when account does not exist to prevent timing enumeration", async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);
        verifyPasswordMock.mockResolvedValue(false);

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/login", {
                body: { identifier: "missing@fpt.edu.vn", password: "Password123!" },
            })
        );
        expect(res.status).toBe(401);
        expect(verifyPasswordMock).toHaveBeenCalledWith("Password123!", undefined);
        expect(setSessionMock).not.toHaveBeenCalled();
    });

    it("rate limits excessive login attempts with 429", async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);
        verifyPasswordMock.mockResolvedValue(false);

        for (let i = 0; i < 20; i++) {
            await POST(
                buildJsonRequest("http://localhost:3000/api/auth/login", {
                    ip: "198.51.100.88",
                    body: { identifier: "a@b.com", password: "bad" },
                })
            );
        }
        const blocked = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/login", {
                ip: "198.51.100.88",
                body: { identifier: "a@b.com", password: "bad" },
            })
        );
        expect(blocked.status).toBe(429);
    });
});
