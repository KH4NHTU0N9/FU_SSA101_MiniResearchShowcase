import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StressGamesHub } from "@/components/features/stress-games-hub";

vi.mock("next/dynamic", () => ({
    default: (loader: () => Promise<unknown>) => {
        const src = loader.toString();
        if (src.includes("color-by-number")) {
            return function MockColor() {
                return <div data-testid="color-game">Color By Number Loaded</div>;
            };
        }
        if (src.includes("ambient-game")) {
            return function MockAmbient() {
                return <div data-testid="ambient-game">Ambient Game Loaded</div>;
            };
        }
        return function MockBubble() {
            return <div data-testid="bubble-game">Bubble Pop Loaded</div>;
        };
    },
}));

describe("features/StressGamesHub", () => {
    it("defaults to Bubble Pop and switches tabs across all three stress-relief games", () => {
        render(<StressGamesHub />);

        const bubbleTab = screen.getByRole("tab", { name: /Bubble Pop/i });
        const colorTab = screen.getByRole("tab", { name: /Color By Number/i });
        const ambientTab = screen.getByRole("tab", { name: /Ambient/i });

        expect(bubbleTab).toHaveAttribute("aria-selected", "true");
        expect(screen.getByTestId("bubble-game")).toBeInTheDocument();

        fireEvent.click(colorTab);
        expect(colorTab).toHaveAttribute("aria-selected", "true");
        expect(screen.getByTestId("color-game")).toBeInTheDocument();

        fireEvent.click(ambientTab);
        expect(ambientTab).toHaveAttribute("aria-selected", "true");
        expect(screen.getByTestId("ambient-game")).toBeInTheDocument();
    });
});
