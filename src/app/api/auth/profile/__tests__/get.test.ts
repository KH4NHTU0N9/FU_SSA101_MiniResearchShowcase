import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
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
    sendEmailChangeVerification: vi.fn(),
}));

import { GET } from "@/app/api/auth/profile/route";

describe("GET /api/auth/profile", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("returns 401 when unauthenticated or tokenVersion mismatches", async () => {
        getSessionMock.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);
    });

    it("returns authenticated user metadata with Cache-Control: no-store", async () => {
        const user = createMockUser({ id: "u5", tokenVersion: 0 });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u5", tokenVersion: 0 }));
        prismaMock.user.findUnique
            .mockResolvedValueOnce(user) // requireAuth
            .mockResolvedValueOnce({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                createdAt: new Date("2026-01-01T00:00:00Z"),
            });

        const res = await GET();
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        const body = (await res.json()) as { user: { id: string; email: string } };
        expect(body.user.id).toBe("u5");
        expect(body.user.email).toBe(user.email);
    });
});
