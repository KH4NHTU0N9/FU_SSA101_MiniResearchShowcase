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
    fetchCommunityPosts: vi.fn(),
    invalidateCommunityCache: invalidateCacheMock,
}));

import { POST } from "@/app/api/community/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/community", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        invalidateCacheMock.mockReset();
    });

    it("rejects CSRF requests and prohibited language while allowing 'assessment'", async () => {
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community", {
                        origin: "https://evil.example",
                        body: { content: "Hi", category: "ACADEMIC" },
                    })
                )
            ).status
        ).toBe(403);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community", {
                        body: { content: "You are stupid", category: "OTHER" },
                    })
                )
            ).status
        ).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.post.create.mockResolvedValue({
            id: "post_1",
            content: "Helpful assessment tips",
            category: "ACADEMIC",
            likes: 0,
            createdAt: new Date("2026-03-01T10:00:00Z"),
            authorId: "u1",
        });

        const okRes = await POST(
            buildJsonRequest("http://localhost:3000/api/community", {
                body: { content: "Helpful assessment tips", category: "ACADEMIC" },
            })
        );
        expect(okRes.status).toBe(201);
        const created = (await okRes.json()) as { author: { name: string } };
        expect(created.author).toEqual({ name: "Anonymous" });
        expect(invalidateCacheMock).toHaveBeenCalledTimes(1);
    });
});
