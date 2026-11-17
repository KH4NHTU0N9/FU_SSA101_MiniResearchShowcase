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

import { GET } from "@/app/api/assessment/route";

describe("GET /api/assessment", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects unauthenticated callers with 401", async () => {
        getSessionMock.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);
    });

    it("fetches only the authenticated user's most recent assessment", async () => {
        const user = createMockUser({ id: "user_1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "user_1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.assessment.findFirst.mockResolvedValue({
            id: "assess_1",
            userId: "user_1",
            depressionScore: 6,
            anxietyScore: 5,
            stressScore: 9,
        });

        const res = await GET();
        expect(res.status).toBe(200);
        expect(prismaMock.assessment.findFirst).toHaveBeenCalledWith({
            where: { userId: "user_1" },
            orderBy: { createdAt: "desc" },
        });
        expect(await res.json()).toMatchObject({ id: "assess_1", depressionScore: 6 });
    });
});
