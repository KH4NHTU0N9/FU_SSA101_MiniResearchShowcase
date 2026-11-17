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

import { POST } from "@/app/api/flashcards/cards/route";

describe("POST /api/flashcards/cards", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("blocks inserting cards into another user's deck (403) or missing deck (404)", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcardDeck.findUnique.mockResolvedValueOnce(null);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/flashcards/cards", {
                        body: { deckId: "missing", front: "Q", back: "A" },
                    })
                )
            ).status
        ).toBe(404);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcardDeck.findUnique.mockResolvedValueOnce({
            id: "d_other",
            userId: "someone_else",
        });

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/flashcards/cards", {
                        body: { deckId: "d_other", front: "Q", back: "A" },
                    })
                )
            ).status
        ).toBe(403);
    });

    it("adds flashcard to deck owned by authenticated caller", async () => {
        const owner = createMockUser({ id: "u_owner" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_owner" }));
        prismaMock.user.findUnique.mockResolvedValue(owner);
        prismaMock.flashcardDeck.findUnique.mockResolvedValue({
            id: "d1",
            userId: "u_owner",
        });
        prismaMock.flashcard.create.mockResolvedValue({
            id: "c1",
            deckId: "d1",
            front: "Big-O",
            back: "Asymptotic upper bound",
        });

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/flashcards/cards", {
                body: { deckId: "d1", front: "  Big-O ", back: "Asymptotic upper bound" },
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.flashcard.create).toHaveBeenCalledWith({
            data: { deckId: "d1", front: "Big-O", back: "Asymptotic upper bound" },
        });
    });
});
