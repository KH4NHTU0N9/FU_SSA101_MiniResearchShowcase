import { Prisma } from "@prisma/client";
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
import { resetRateLimitStore } from "@/lib/security";

describe("PATCH /api/auth/profile — action=updateProfile", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        setSessionMock.mockReset();
    });

    it("updates user name & phone and refreshes signed session cookie", async () => {
        const user = createMockUser({ id: "u1", tokenVersion: 1 });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", tokenVersion: 1 }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.user.update.mockResolvedValue({
            ...user,
            name: "Updated Name",
            phone: "0911222333",
        });

        const res = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: {
                    action: "updateProfile",
                    name: "  Updated Name  ",
                    phone: "0911-222-333",
                },
            })
        );
        expect(res.status).toBe(200);
        expect(setSessionMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: "u1", name: "Updated Name" })
        );
    });

    it("maps unique phone constraint conflicts to 409", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.user.update.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique", {
                code: "P2002",
                clientVersion: "6.19.2",
            })
        );

        const res = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: {
                    action: "updateProfile",
                    phone: "0911222333",
                },
            })
        );
        expect(res.status).toBe(409);
    });
});
