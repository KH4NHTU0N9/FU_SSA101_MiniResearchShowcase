import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckDetail } from "@/components/features/flashcards/deck-detail";
import type { FlashcardDeckDTO } from "@/types";

const deckWithCards: FlashcardDeckDTO = {
    id: "d1",
    title: "Algorithms",
    color: "bg-cyan-500",
    cards: [{ id: "c1", front: "BFS", back: "Breadth-First Search" }],
};

describe("features/flashcards/DeckDetail", () => {
    it("displays existing cards, handles card creation and deletion, and launches study mode", async () => {
        const onBack = vi.fn();
        const onStudy = vi.fn();
        const onAddCard = vi.fn().mockResolvedValue(true);
        const onRemoveCard = vi.fn();

        const { rerender } = render(
            <DeckDetail
                deck={deckWithCards}
                onBack={onBack}
                onStudy={onStudy}
                onAddCard={onAddCard}
                onRemoveCard={onRemoveCard}
            />
        );

        expect(screen.getByText("BFS")).toBeInTheDocument();
        expect(screen.getByText("1 cards")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Study Deck" }));
        expect(onStudy).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole("button", { name: "Remove card BFS" }));
        expect(onRemoveCard).toHaveBeenCalledWith("c1");

        fireEvent.change(screen.getByLabelText("Front (Term/Question)"), {
            target: { value: "  DFS  " },
        });
        fireEvent.change(screen.getByLabelText("Back (Definition/Answer)"), {
            target: { value: "  Depth-First Search  " },
        });
        fireEvent.click(screen.getByRole("button", { name: /Add Card/i }));

        await waitFor(() => {
            expect(onAddCard).toHaveBeenCalledWith("DFS", "Depth-First Search");
        });

        fireEvent.click(screen.getByRole("button", { name: "Back to deck library" }));
        expect(onBack).toHaveBeenCalledTimes(1);

        rerender(
            <DeckDetail
                deck={{ ...deckWithCards, cards: [] }}
                onBack={onBack}
                onStudy={onStudy}
                onAddCard={onAddCard}
                onRemoveCard={onRemoveCard}
            />
        );
        expect(screen.getByRole("button", { name: "Study Deck" })).toBeDisabled();
    });
});
