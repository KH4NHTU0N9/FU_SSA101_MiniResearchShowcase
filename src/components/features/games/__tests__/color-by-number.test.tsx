import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorByNumberGame } from "@/components/features/games/color-by-number";

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, className }: { children?: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
    },
}));

describe("features/games/ColorByNumberGame", () => {
    it("allows switching colors, painting target cells, completing Heart template, and advancing to Flower", () => {
        render(<ColorByNumberGame />);

        expect(screen.getByText("Heart")).toBeInTheDocument();

        const target1Buttons = screen.getAllByRole("button", {
            name: /target color 1, unpainted/i,
        });
        expect(target1Buttons.length).toBeGreaterThan(0);

        for (const btn of target1Buttons) {
            fireEvent.click(btn);
        }

        fireEvent.click(screen.getByRole("button", { name: "Select color 2: Emerald" }));
        const target2Buttons = screen.getAllByRole("button", {
            name: /target color 2, unpainted/i,
        });
        for (const btn of target2Buttons) {
            fireEvent.click(btn);
        }

        expect(screen.getByText("Beautifully done!")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Next Art" }));
        expect(screen.getByText("Flower")).toBeInTheDocument();
    });

    it("resets painted cells via Start Over", () => {
        render(<ColorByNumberGame />);

        const firstCell = screen.getAllByRole("button", { name: /target color 1, unpainted/i })[0];
        fireEvent.click(firstCell);
        expect(screen.getAllByRole("button", { name: /painted Rose/i })).toHaveLength(1);

        fireEvent.click(screen.getByRole("button", { name: /Start Over/i }));
        expect(screen.queryByRole("button", { name: /painted Rose/i })).toBeNull();
    });
});
