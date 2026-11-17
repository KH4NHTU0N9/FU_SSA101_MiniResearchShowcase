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
}));

import { GET } from "@/app/api/auth/me/route";

describe("GET /api/auth/me", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("returns { user: null } with Cache-Control: no-store when unauthenticated or tokenVersion stale", async () => {
        getSessionMock.mockResolvedValue(null);
        const resAnon = await GET();
        expect(resAnon.headers.get("Cache-Control")).toBe("no-store");
        expect(await resAnon.json()).toEqual({ user: null });

        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", tokenVersion: 0 }));
        prismaMock.user.findUnique.mockResolvedValue(createMockUser({ id: "u1", tokenVersion: 1 }));
        const resStale = await GET();
        expect(await resStale.json()).toEqual({ user: null });
    });

    it("returns public user profile when session and tokenVersion match DB", async () => {
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", tokenVersion: 2 }));
        prismaMock.user.findUnique.mockResolvedValue(createMockUser({ id: "u1", tokenVersion: 2 }));

        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            user: {
                id: "u1",
                name: "Test Student",
                email: "student@fpt.edu.vn",
                phone: "0901234567",
            },
        });
    });
});
