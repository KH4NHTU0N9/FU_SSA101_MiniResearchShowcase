import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyMode } from "@/components/features/flashcards/study-mode";
import type { FlashcardDeckDTO } from "@/types";

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, className }: { children: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
    },
}));

const deck: FlashcardDeckDTO = {
    id: "d1",
    title: "Networking",
    color: "bg-indigo-500",
    cards: [
        { id: "c1", front: "HTTP", back: "Hypertext Transfer Protocol" },
        { id: "c2", front: "TLS", back: "Transport Layer Security" },
    ],
};

describe("features/flashcards/StudyMode", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("flips cards, navigates forward and backward with wraparound, and exits on Escape", () => {
        const onExit = vi.fn();
        render(<StudyMode deck={deck} onExit={onExit} />);

        expect(screen.getByText("1 / 2")).toBeInTheDocument();
        const cardBtn = screen.getByRole("button", { name: "Show definition back" });
        expect(cardBtn).toHaveAttribute("aria-pressed", "false");

        fireEvent.click(cardBtn);
        expect(screen.getByRole("button", { name: "Show term front" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        fireEvent.click(screen.getByRole("button", { name: "Next card" }));
        act(() => {
            vi.advanceTimersByTime(260);
        });
        expect(screen.getByText("2 / 2")).toBeInTheDocument();
        expect(screen.getByText("TLS")).toBeInTheDocument();

        fireEvent.keyDown(window, { key: "ArrowLeft" });
        act(() => {
            vi.advanceTimersByTime(260);
        });
        expect(screen.getByText("1 / 2")).toBeInTheDocument();

        fireEvent.keyDown(window, { key: "Escape" });
        expect(onExit).toHaveBeenCalledTimes(1);
    });

    it("renders empty-deck guard with back button", () => {
        const onExit = vi.fn();
        render(<StudyMode deck={{ ...deck, cards: [] }} onExit={onExit} />);

        expect(screen.getByText("This deck has no flashcards to study.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Back to Deck" }));
        expect(onExit).toHaveBeenCalledTimes(1);
    });
});
