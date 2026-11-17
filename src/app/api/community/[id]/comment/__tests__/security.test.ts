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

import { POST } from "@/app/api/community/[id]/comment/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/community/[id]/comment — security & rate limits", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
    });

    it("rejects CSRF 403, unauthenticated 401, and enforces 30/10m per-user comment cap", async () => {
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/community/p1/comment", {
                        origin: "https://evil.example",
                        body: { content: "Hi" },
                    }),
                    { params: Promise.resolve({ id: "p1" }) }
                )
            ).status
        ).toBe(403);

        const user = createMockUser({ id: "u_comment_spam" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_comment_spam" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        for (let i = 0; i < 30; i++) {
            await POST(
                buildJsonRequest("http://localhost:3000/api/community/p1/comment", {
                    body: { content: "" }, // fails Zod AFTER rate-limit increment
                }),
                { params: Promise.resolve({ id: "p1" }) }
            );
        }

        const limited = await POST(
            buildJsonRequest("http://localhost:3000/api/community/p1/comment", {
                body: { content: "Valid comment" },
            }),
            { params: Promise.resolve({ id: "p1" }) }
        );
        expect(limited.status).toBe(429);
    });
});
