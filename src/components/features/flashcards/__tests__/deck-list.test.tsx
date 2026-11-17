import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckList } from "@/components/features/flashcards/deck-list";
import type { FlashcardDeckDTO } from "@/types";

const sampleDecks: FlashcardDeckDTO[] = [
    {
        id: "d1",
        title: "Psychology 101",
        description: "Core cognition terms",
        color: "bg-indigo-500",
        cards: [{ id: "c1", front: "Schema", back: "Mental framework" }],
    },
];

describe("features/flashcards/DeckList", () => {
    it("renders deck cards, empty fallback, and triggers create/select/delete actions", async () => {
        const onCreate = vi.fn().mockResolvedValue(true);
        const onDelete = vi.fn();
        const onSelect = vi.fn();

        const { rerender } = render(
            <DeckList
                decks={sampleDecks}
                onCreate={onCreate}
                onDelete={onDelete}
                onSelect={onSelect}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /^Psychology 101/i }));
        expect(onSelect).toHaveBeenCalledWith("d1");

        fireEvent.click(screen.getByRole("button", { name: "Delete Psychology 101" }));
        expect(onDelete).toHaveBeenCalledWith("d1");

        fireEvent.click(screen.getByRole("button", { name: /Create Deck/i }));
        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Anatomy  " } });
        fireEvent.change(screen.getByLabelText("Description (Optional)"), {
            target: { value: "  Nervous system  " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Select deck color emerald" }));
        const submitBtn = screen.getAllByRole("button", { name: /Create Deck/i }).pop()!;
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(onCreate).toHaveBeenCalledWith("Anatomy", "Nervous system", "bg-emerald-500");
        });

        rerender(
            <DeckList decks={[]} onCreate={onCreate} onDelete={onDelete} onSelect={onSelect} />
        );
        expect(screen.getByText("No decks found. Create one to get started!")).toBeInTheDocument();
    });
});
