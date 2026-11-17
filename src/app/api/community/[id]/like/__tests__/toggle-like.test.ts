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

import { POST } from "@/app/api/community/[id]/like/route";

describe("POST /api/community/[id]/like — transactional toggle", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
        invalidateCacheMock.mockReset();
    });

    it("adds like record, recalculates exact count, and updates Post atomically", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.post.findUnique.mockResolvedValue({ id: "post_1" });
        prismaMock.postLike.findUnique.mockResolvedValue(null);
        prismaMock.postLike.create.mockResolvedValue({ id: "like_1" });
        prismaMock.postLike.count.mockResolvedValue(5);
        prismaMock.post.update.mockResolvedValue({});

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/community/post_1/like"),
            { params: Promise.resolve({ id: "post_1" }) }
        );
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ likes: 5, liked: true });
        expect(invalidateCacheMock).toHaveBeenCalledTimes(1);
    });

    it("removes existing like record when already liked and decrements count cleanly", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.post.findUnique.mockResolvedValue({ id: "post_1" });
        prismaMock.postLike.findUnique.mockResolvedValue({ id: "like_existing" });
        prismaMock.postLike.delete.mockResolvedValue({});
        prismaMock.postLike.count.mockResolvedValue(4);
        prismaMock.post.update.mockResolvedValue({});

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/community/post_1/like"),
            { params: Promise.resolve({ id: "post_1" }) }
        );
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ likes: 4, liked: false });
        expect(prismaMock.postLike.delete).toHaveBeenCalledWith({
            where: { id: "like_existing" },
        });
    });
});
