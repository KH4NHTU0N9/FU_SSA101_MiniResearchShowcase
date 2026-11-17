import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, invalidateCacheMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    invalidateCacheMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

vi.mock("@/lib/community/queries", () => ({
    invalidateCommunityCache: invalidateCacheMock,
}));

import { POST } from "@/app/api/community/[id]/comment/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/community/[id]/comment — creation & moderation", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        invalidateCacheMock.mockReset();
    });

    it("blocks abusive comments and missing posts", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community/p1/comment", {
                        body: { content: "Don't be so stupid" },
                    }),
                    { params: Promise.resolve({ id: "p1" }) }
                )
            ).status
        ).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.post.findUnique.mockResolvedValue(null);
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community/p_missing/comment", {
                        body: { content: "Hang in there!" },
                    }),
                    { params: Promise.resolve({ id: "p_missing" }) }
                )
            ).status
        ).toBe(404);
    });

    it("creates comment with anonymized author and invalidates cache", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.post.findUnique.mockResolvedValue({ id: "p1" });
        prismaMock.comment.create.mockResolvedValue({
            id: "c_1",
            postId: "p1",
            authorId: "u1",
            content: "You've got this!",
            createdAt: new Date("2026-03-01T12:00:00Z"),
        });

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/community/p1/comment", {
                body: { content: "  You've got this!  " },
            }),
            { params: Promise.resolve({ id: "p1" }) }
        );
        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({
            id: "c_1",
            content: "You've got this!",
            author: { name: "Anonymous" },
        });
        expect(invalidateCacheMock).toHaveBeenCalledTimes(1);
    });
});
