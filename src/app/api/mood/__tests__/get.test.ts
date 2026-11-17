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

import { GET } from "@/app/api/mood/route";

describe("GET /api/mood", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects unauthenticated callers with 401", async () => {
        getSessionMock.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);
    });

    it("queries up to 14 latest mood check-ins scoped to authenticated user", async () => {
        const user = createMockUser({ id: "u_mood" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_mood" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.moodLog.findMany.mockResolvedValue([{ id: "m1", mood: 4 }]);

        const res = await GET();
        expect(res.status).toBe(200);
        expect(prismaMock.moodLog.findMany).toHaveBeenCalledWith({
            where: { userId: "u_mood" },
            orderBy: { createdAt: "desc" },
            take: 14,
        });
        expect(await res.json()).toEqual([{ id: "m1", mood: 4 }]);
    });
});
