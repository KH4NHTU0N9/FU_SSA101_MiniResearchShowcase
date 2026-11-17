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

import { GET } from "@/app/api/flashcards/route";

describe("GET /api/flashcards", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects unauthenticated requests with 401 and lists user decks with sorted cards", async () => {
        getSessionMock.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);

        const user = createMockUser({ id: "u_fc" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_fc" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcardDeck.findMany.mockResolvedValue([
            { id: "d1", title: "OS Concepts", cards: [] },
        ]);

        const res = await GET();
        expect(res.status).toBe(200);
        expect(prismaMock.flashcardDeck.findMany).toHaveBeenCalledWith({
            where: { userId: "u_fc" },
            include: { cards: { orderBy: { createdAt: "asc" } } },
            orderBy: { createdAt: "desc" },
        });
    });
});
