import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, fetchCommunityPostsMock, invalidateCacheMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    fetchCommunityPostsMock: vi.fn(),
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
    fetchCommunityPosts: fetchCommunityPostsMock,
    invalidateCommunityCache: invalidateCacheMock,
}));

import { GET } from "@/app/api/community/route";

describe("GET /api/community", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
        fetchCommunityPostsMock.mockReset();
    });

    it("rejects unauthenticated requests with 401 and unknown categories with 400", async () => {
        getSessionMock.mockResolvedValue(null);
        expect(
            (await GET(buildJsonRequest("http://localhost:3000/api/community", { method: "GET" })))
                .status
        ).toBe(401);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await GET(
                    buildJsonRequest("http://localhost:3000/api/community?category=INVALID", {
                        method: "GET",
                    })
                )
            ).status
        ).toBe(400);
    });

    it("delegates paginated category queries with authenticated currentUserId", async () => {
        const user = createMockUser({ id: "u_comm" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_comm" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        fetchCommunityPostsMock.mockResolvedValue([{ id: "p1", content: "Hello" }]);

        const res = await GET(
            buildJsonRequest(
                "http://localhost:3000/api/community?category=ACADEMIC&page=2&limit=5",
                { method: "GET" }
            )
        );
        expect(res.status).toBe(200);
        expect(fetchCommunityPostsMock).toHaveBeenCalledWith({
            category: "ACADEMIC",
            page: 2,
            limit: 5,
            currentUserId: "u_comm",
        });
    });
});
