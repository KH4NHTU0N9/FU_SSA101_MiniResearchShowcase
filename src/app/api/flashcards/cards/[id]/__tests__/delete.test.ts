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

import { DELETE } from "@/app/api/flashcards/cards/[id]/route";

describe("DELETE /api/flashcards/cards/[id]", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("enforces parent deck userId ownership before deleting card", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcard.findUnique.mockResolvedValueOnce(null);

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/flashcards/cards/c1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "c1" }) }
                )
            ).status
        ).toBe(404);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcard.findUnique.mockResolvedValueOnce({
            id: "c1",
            deck: { userId: "other_user" },
        });

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/flashcards/cards/c1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "c1" }) }
                )
            ).status
        ).toBe(403);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcard.findUnique.mockResolvedValueOnce({
            id: "c1",
            deck: { userId: "u1" },
        });
        prismaMock.flashcard.delete.mockResolvedValue({});

        const okRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/flashcards/cards/c1", {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: "c1" }) }
        );
        expect(okRes.status).toBe(200);
        expect(prismaMock.flashcard.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    });
});
