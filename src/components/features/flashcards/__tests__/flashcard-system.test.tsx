import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardSystem } from "@/components/features/flashcard-system";

const { showToastMock, confirmActionMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
    confirmActionMock: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({
        showToast: showToastMock,
        confirmAction: confirmActionMock,
    }),
}));

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, className }: { children: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
    },
}));

describe("features/FlashcardSystem", () => {
    beforeEach(() => {
        showToastMock.mockReset();
        confirmActionMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("orchestrates creating a deck, opening it, adding a card, entering study mode, and deleting the deck", async () => {
        confirmActionMock.mockResolvedValue(true);
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        id: "deck-new",
                        title: "OS Concepts",
                        description: "Processes",
                        color: "bg-rose-500",
                        cards: [],
                    }),
                    { status: 201 }
                )
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        id: "card-1",
                        front: "Mutex",
                        back: "Mutual exclusion lock",
                    }),
                    { status: 201 }
                )
            )
            .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        render(<FlashcardSystem initialDecks={[]} />);

        fireEvent.click(screen.getByRole("button", { name: /Create Deck/i }));
        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "OS Concepts" } });
        fireEvent.change(screen.getByLabelText("Description (Optional)"), {
            target: { value: "Processes" },
        });
        fireEvent.click(screen.getAllByRole("button", { name: /Create Deck/i }).pop()!);

        expect(await screen.findByText("OS Concepts")).toBeInTheDocument();
        expect(showToastMock).toHaveBeenCalledWith("Deck created.", "success");

        fireEvent.click(screen.getByRole("button", { name: /^OS Concepts/i }));
        fireEvent.change(screen.getByLabelText("Front (Term/Question)"), {
            target: { value: "Mutex" },
        });
        fireEvent.change(screen.getByLabelText("Back (Definition/Answer)"), {
            target: { value: "Mutual exclusion lock" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Add Card/i }));

        expect(await screen.findByText("Mutex")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Study Deck" }));
        expect(screen.getByText("1 / 1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Exit/i }));

        fireEvent.click(screen.getByRole("button", { name: "Back to deck library" }));
        fireEvent.click(screen.getByRole("button", { name: "Delete OS Concepts" }));

        await waitFor(() => {
            expect(confirmActionMock).toHaveBeenCalledTimes(1);
            expect(screen.queryByText("OS Concepts")).not.toBeInTheDocument();
            expect(showToastMock).toHaveBeenCalledWith("Deck deleted.", "info");
        });
    });
});
