import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
    revalidatePathMock: vi.fn(),
    revalidateTagMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("next/cache", () => ({
    unstable_cache: (fn: () => Promise<unknown>) => fn,
    revalidatePath: revalidatePathMock,
    revalidateTag: revalidateTagMock,
}));

import {
    COMMUNITY_CACHE_TAG,
    fetchCommunityPosts,
    invalidateCommunityCache,
} from "@/lib/community/queries";

describe("lib/community/queries", () => {
    beforeEach(() => {
        resetPrismaMocks();
        revalidatePathMock.mockReset();
        revalidateTagMock.mockReset();
    });

    it("returns anonymized posts and overlays viewer-specific like status without leaking author email", async () => {
        const now = new Date("2026-03-01T10:00:00.000Z");
        prismaMock.post.findMany.mockResolvedValue([
            {
                id: "post_1",
                content: "How to stay calm before finals?",
                category: "ACADEMIC",
                likes: 4,
                createdAt: now,
                authorId: "author_1",
                comments: [
                    {
                        id: "c_1",
                        postId: "post_1",
                        authorId: "author_2",
                        content: "Take 5-minute breaks!",
                        createdAt: now,
                    },
                ],
            },
        ]);
        prismaMock.postLike.findMany.mockResolvedValue([{ postId: "post_1" }]);

        const posts = await fetchCommunityPosts({
            category: "ACADEMIC",
            page: 1,
            limit: 10,
            currentUserId: "viewer_1",
        });

        expect(posts).toHaveLength(1);
        expect(posts[0].author).toEqual({ name: "Anonymous" });
        expect(posts[0].likedByUser).toBe(true);
        expect(posts[0].comments[0].author).toEqual({ name: "Anonymous" });
    });

    it("invalidates both cache tag and /community route path", () => {
        invalidateCommunityCache();
        expect(revalidateTagMock).toHaveBeenCalledWith(COMMUNITY_CACHE_TAG, { expire: 0 });
        expect(revalidatePathMock).toHaveBeenCalledWith("/community");
    });
});
