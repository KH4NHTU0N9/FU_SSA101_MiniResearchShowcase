import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
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

vi.mock("@/lib/community/queries", () => ({
    invalidateCommunityCache: vi.fn(),
}));

import { POST } from "@/app/api/community/[id]/like/route";

describe("POST /api/community/[id]/like — security & 404 guards", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects CSRF 403, unauthenticated 401, and missing post 404", async () => {
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community/p1/like", {
                        origin: "https://evil.example",
                    }),
                    { params: Promise.resolve({ id: "p1" }) }
                )
            ).status
        ).toBe(403);

        getSessionMock.mockResolvedValue(null);
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community/p1/like"),
                    { params: Promise.resolve({ id: "p1" }) }
                )
            ).status
        ).toBe(401);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.post.findUnique.mockResolvedValue(null);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community/p_missing/like"),
                    { params: Promise.resolve({ id: "p_missing" }) }
                )
            ).status
        ).toBe(404);
    });
});
