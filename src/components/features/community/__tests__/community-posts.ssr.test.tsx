import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { redirectMock, getSessionMock, fetchPostsMock } = vi.hoisted(() => ({
    redirectMock: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    getSessionMock: vi.fn(),
    fetchPostsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: redirectMock,
}));

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
    prisma: prismaMock,
}));

vi.mock("@/lib/community/queries", () => ({
    fetchCommunityPosts: fetchPostsMock,
}));

vi.mock("@/components/features/community/community-feed", () => ({
    CommunityFeed: ({ initialPosts }: { initialPosts: Array<{ id: string }> }) => (
        <div data-testid="community-feed" data-count={initialPosts.length} />
    ),
}));

import { CommunityPosts } from "@/components/features/community/community-posts";

describe("features/community/CommunityPosts SSR", () => {
    beforeEach(() => {
        resetPrismaMocks();
        redirectMock.mockClear();
        getSessionMock.mockReset();
        fetchPostsMock.mockReset();
    });

    it("redirects unauthenticated or revoked users to /login", async () => {
        getSessionMock.mockResolvedValue(null);
        await expect(CommunityPosts()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("fetches page 1 posts for verified user and passes them to CommunityFeed", async () => {
        getSessionMock.mockResolvedValue({ user: { id: "u1", tokenVersion: 1 } });
        prismaMock.user.findUnique.mockResolvedValue({ id: "u1", tokenVersion: 1 } as never);
        fetchPostsMock.mockResolvedValue([
            {
                id: "p1",
                content: "Stay balanced",
                category: "ACADEMIC",
                likes: 2,
                createdAt: "2026-03-01T00:00:00.000Z",
                authorId: "u2",
                author: { name: "Anonymous" },
                comments: [],
            },
        ]);

        const tree = await CommunityPosts();
        render(tree);

        expect(fetchPostsMock).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            currentUserId: "u1",
        });
        expect(screen.getByTestId("community-feed")).toHaveAttribute("data-count", "1");
    });
});
