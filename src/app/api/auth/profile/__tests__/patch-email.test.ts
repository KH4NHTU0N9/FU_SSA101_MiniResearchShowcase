import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, verifyPasswordMock, sendEmailChangeMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    verifyPasswordMock: vi.fn(),
    sendEmailChangeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
    setSession: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
    sendEmailChangeVerification: sendEmailChangeMock,
}));

vi.mock("@/lib/security", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/security")>();
    return {
        ...actual,
        verifyPassword: verifyPasswordMock,
    };
});

import { PATCH } from "@/app/api/auth/profile/route";
import { resetRateLimitStore } from "@/lib/security";

describe("PATCH /api/auth/profile — action=requestEmailChange", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        verifyPasswordMock.mockReset();
        sendEmailChangeMock.mockReset();
        vi.stubEnv("JWT_SECRET", "email-change-test-secret-minimum-32-chars");
    });

    it("rejects matching current email and invalid current passwords", async () => {
        const user = createMockUser({ id: "u1", email: "old@fpt.edu.vn" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", email: "old@fpt.edu.vn" }));
        prismaMock.user.findUnique.mockResolvedValue({ ...user, password: "hash" });

        const sameEmailRes = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: {
                    action: "requestEmailChange",
                    newEmail: "old@fpt.edu.vn",
                    currentPassword: "pass",
                },
            })
        );
        expect(sameEmailRes.status).toBe(400);

        verifyPasswordMock.mockResolvedValue(false);
        const wrongPassRes = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: {
                    action: "requestEmailChange",
                    newEmail: "new@fpt.edu.vn",
                    currentPassword: "wrong",
                },
            })
        );
        expect(wrongPassRes.status).toBe(400);
    });

    it("creates PendingEmailChange and sends OTP email when credentials and availability pass", async () => {
        const user = createMockUser({ id: "u1", email: "old@fpt.edu.vn" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", email: "old@fpt.edu.vn" }));
        prismaMock.user.findUnique
            .mockResolvedValueOnce(user)
            .mockResolvedValueOnce({ id: "u1", password: "hash" })
            .mockResolvedValueOnce(null);
        verifyPasswordMock.mockResolvedValue(true);
        prismaMock.pendingEmailChange.upsert.mockResolvedValue({});
        sendEmailChangeMock.mockResolvedValue(true);

        const res = await PATCH(
            buildJsonRequest("http://localhost:3000/api/auth/profile", {
                method: "PATCH",
                body: {
                    action: "requestEmailChange",
                    newEmail: "NEW@FPT.EDU.VN",
                    currentPassword: "Password123!",
                },
            })
        );
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            pendingVerification: true,
            newEmail: "new@fpt.edu.vn",
        });
        expect(sendEmailChangeMock).toHaveBeenCalledTimes(1);
    });
});
