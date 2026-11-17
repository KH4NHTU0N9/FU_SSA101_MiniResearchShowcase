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

import { DELETE } from "@/app/api/community/[id]/route";

describe("DELETE /api/community/[id]", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
        invalidateCacheMock.mockReset();
    });

    it("enforces post ownership against IDOR deletion and returns 404 when absent", async () => {
        const attacker = createMockUser({ id: "attacker_1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "attacker_1" }));
        prismaMock.user.findUnique.mockResolvedValue(attacker);
        prismaMock.post.findUnique.mockResolvedValueOnce(null);

        const missingRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/community/p1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "p1" }) }
        );
        expect(missingRes.status).toBe(404);

        prismaMock.user.findUnique.mockResolvedValue(attacker);
        prismaMock.post.findUnique.mockResolvedValueOnce({
            id: "p1",
            authorId: "victim_user",
        });

        const forbiddenRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/community/p1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "p1" }) }
        );
        expect(forbiddenRes.status).toBe(403);
        expect(prismaMock.post.delete).not.toHaveBeenCalled();
    });

    it("deletes post for its rightful author and invalidates cache", async () => {
        const author = createMockUser({ id: "author_1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "author_1" }));
        prismaMock.user.findUnique.mockResolvedValue(author);
        prismaMock.post.findUnique.mockResolvedValue({
            id: "p1",
            authorId: "author_1",
        });
        prismaMock.post.delete.mockResolvedValue({});

        const okRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/community/p1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "p1" }) }
        );
        expect(okRes.status).toBe(200);
        expect(prismaMock.post.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
        expect(invalidateCacheMock).toHaveBeenCalledTimes(1);
    });
});
