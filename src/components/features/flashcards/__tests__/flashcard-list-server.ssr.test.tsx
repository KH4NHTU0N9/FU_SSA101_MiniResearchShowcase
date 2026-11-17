import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { redirectMock, getSessionMock } = vi.hoisted(() => ({
    redirectMock: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    getSessionMock: vi.fn(),
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

vi.mock("@/components/features/flashcard-system", () => ({
    FlashcardSystem: ({ initialDecks }: { initialDecks: Array<{ id: string }> }) => (
        <div data-testid="flashcard-system" data-decks={initialDecks.length} />
    ),
}));

import { FlashcardListServer } from "@/components/features/flashcards/flashcard-list-server";

describe("features/flashcards/FlashcardListServer SSR", () => {
    beforeEach(() => {
        resetPrismaMocks();
        redirectMock.mockClear();
        getSessionMock.mockReset();
    });

    it("redirects when session is missing or tokenVersion is stale", async () => {
        getSessionMock.mockResolvedValue(null);
        await expect(FlashcardListServer()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("queries user decks with ordered cards and passes them to FlashcardSystem", async () => {
        getSessionMock.mockResolvedValue({ user: { id: "u1", tokenVersion: 3 } });
        prismaMock.user.findUnique.mockResolvedValue({ id: "u1", tokenVersion: 3 } as never);
        prismaMock.flashcardDeck.findMany.mockResolvedValue([
            {
                id: "d1",
                title: "Math",
                description: null,
                color: "bg-indigo-500",
                cards: [{ id: "c1", front: "A", back: "B" }],
            },
        ] as never);

        const tree = await FlashcardListServer();
        render(tree);

        expect(prismaMock.flashcardDeck.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: "u1" } })
        );
        expect(screen.getByTestId("flashcard-system")).toHaveAttribute("data-decks", "1");
    });
});
