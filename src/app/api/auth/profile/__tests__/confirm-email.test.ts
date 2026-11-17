import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, setSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    setSessionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
    setSession: setSessionMock,
}));

vi.mock("@/lib/email", () => ({
    sendEmailChangeVerification: vi.fn(),
}));

import { PATCH } from "@/app/api/auth/profile/route";
import { hashOtp, resetRateLimitStore } from "@/lib/security";

describe("PATCH /api/auth/profile — action=confirmEmailChange", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        setSessionMock.mockReset();
        vi.stubEnv("JWT_SECRET", "confirm-email-test-secret-minimum-32-chars");
    });

    it("locks out pending email change on 5th failed OTP attempt", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.pendingEmailChange.findUnique.mockResolvedValue({
            userId: "u1",
            newEmail: "next@fpt.edu.vn",
            otpHash: hashOtp("next@fpt.edu.vn", "123456"),
            expiresAt: new Date(Date.now() + 60_000),
            attempts: 4,
        });
        prismaMock.pendingEmailChange.delete.mockResolvedValue({});

        const res = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: { action: "confirmEmailChange", code: "000000" },
            })
        );
        expect(res.status).toBe(429);
        expect(prismaMock.pendingEmailChange.delete).toHaveBeenCalledWith({
            where: { userId: "u1" },
        });
    });

    it("updates user email, increments tokenVersion, deletes pending row, and refreshes cookie", async () => {
        const user = createMockUser({ id: "u1", tokenVersion: 0 });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", tokenVersion: 0 }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.pendingEmailChange.findUnique.mockResolvedValue({
            userId: "u1",
            newEmail: "next@fpt.edu.vn",
            otpHash: hashOtp("next@fpt.edu.vn", "654321"),
            expiresAt: new Date(Date.now() + 60_000),
            attempts: 0,
        });
        prismaMock.user.update.mockResolvedValue({
            ...user,
            email: "next@fpt.edu.vn",
            tokenVersion: 1,
        });
        prismaMock.pendingEmailChange.delete.mockResolvedValue({});

        const res = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: { action: "confirmEmailChange", code: "654321" },
            })
        );
        expect(res.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(setSessionMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "next@fpt.edu.vn",
                tokenVersion: 1,
            })
        );
    });
});
