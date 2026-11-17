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

describe("POST /api/auth/login — email & phone sign-in", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        setSessionMock.mockReset();
        verifyPasswordMock.mockReset();
    });

    it("authenticates by normalized email, sets session cookie with tokenVersion, and omits password hash", async () => {
        prismaMock.user.findFirst.mockResolvedValue({
            id: "u1",
            name: "An Nguyen",
            email: "student@fpt.edu.vn",
            phone: "0901234567",
            password: "hash",
            tokenVersion: 3,
        });
        verifyPasswordMock.mockResolvedValue(true);

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/login", {
                body: { identifier: "  STUDENT@FPT.EDU.VN ", password: "Password123!" },
            })
        );
        expect(res.status).toBe(200);
        expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { email: "student@fpt.edu.vn" } })
        );
        expect(setSessionMock).toHaveBeenCalledWith({
            id: "u1",
            email: "student@fpt.edu.vn",
            name: "An Nguyen",
            tokenVersion: 3,
        });
        const json = (await res.json()) as { user: Record<string, unknown> };
        expect(json.user.password).toBeUndefined();
    });

    it("strips phone formatting separators when logging in by phone number", async () => {
        prismaMock.user.findFirst.mockResolvedValue({
            id: "u2",
            name: "Minh",
            email: "minh@fpt.edu.vn",
            phone: "0987654321",
            password: "hash",
            tokenVersion: 0,
        });
        verifyPasswordMock.mockResolvedValue(true);

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/login", {
                body: { identifier: "098-765 4321", password: "Password123!" },
            })
        );
        expect(res.status).toBe(200);
        expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { phone: "0987654321" } })
        );
    });
});
