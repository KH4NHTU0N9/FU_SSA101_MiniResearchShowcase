import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, setSessionMock, verifyPasswordMock, hashPasswordMock } = vi.hoisted(
    () => ({
        getSessionMock: vi.fn(),
        setSessionMock: vi.fn(),
        verifyPasswordMock: vi.fn(),
        hashPasswordMock: vi.fn(),
    })
);

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

vi.mock("@/lib/security", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/security")>();
    return {
        ...actual,
        verifyPassword: verifyPasswordMock,
        hashPassword: hashPasswordMock,
    };
});

import { PATCH } from "@/app/api/auth/profile/route";
import { resetRateLimitStore } from "@/lib/security";

describe("PATCH /api/auth/profile — action=changePassword", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        setSessionMock.mockReset();
        verifyPasswordMock.mockReset();
        hashPasswordMock.mockReset();
    });

    it("rejects incorrect currentPassword and increments tokenVersion on success", async () => {
        const user = createMockUser({ id: "u1", tokenVersion: 2 });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", tokenVersion: 2 }));
        prismaMock.user.findUnique
            .mockResolvedValueOnce(user)
            .mockResolvedValueOnce({ ...user, password: "old_hash" })
            .mockResolvedValueOnce(user)
            .mockResolvedValueOnce({ ...user, password: "old_hash" });

        verifyPasswordMock.mockResolvedValueOnce(false);
        const failRes = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: {
                    action: "changePassword",
                    currentPassword: "wrong",
                    newPassword: "NewStrongPassword#2026",
                },
            })
        );
        expect(failRes.status).toBe(400);

        verifyPasswordMock.mockResolvedValueOnce(true);
        hashPasswordMock.mockResolvedValueOnce("new_bcrypt_hash");
        prismaMock.user.update.mockResolvedValue({
            ...user,
            tokenVersion: 3,
        });

        const okRes = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: {
                    action: "changePassword",
                    currentPassword: "OldPassword#2026",
                    newPassword: "NewStrongPassword#2026",
                },
            })
        );
        expect(okRes.status).toBe(200);
        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    password: "new_bcrypt_hash",
                    tokenVersion: { increment: 1 },
                }),
            })
        );
        expect(setSessionMock).toHaveBeenCalledWith(
            expect.objectContaining({ tokenVersion: 3 })
        );
    });
});
