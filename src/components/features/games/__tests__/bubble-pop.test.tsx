import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BubblePopGame } from "@/components/features/games/bubble-pop";

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
        button: ({
            children,
            className,
            disabled,
            "aria-label": ariaLabel,
            onClick,
        }: {
            children?: ReactNode;
            className?: string;
            disabled?: boolean;
            "aria-label"?: string;
            onClick?: () => void;
        }) => (
            <button
                type="button"
                className={className}
                disabled={disabled}
                aria-label={ariaLabel}
                onClick={onClick}
            >
                {children}
            </button>
        ),
        div: ({ children, className }: { children?: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
    },
}));

describe("features/games/BubblePopGame", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal(
            "Audio",
            class MockAudio {
                volume = 0.5;
                currentTime = 0;
                play = vi.fn().mockResolvedValue(undefined);
            }
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("increments score when popping bubbles, auto-resets after popping all 25, and supports manual reset", () => {
        render(<BubblePopGame />);

        expect(screen.getByText("Score: 0")).toBeInTheDocument();

        for (let i = 1; i <= 25; i++) {
            fireEvent.click(screen.getByRole("button", { name: `Pop bubble ${i}` }));
        }

        expect(screen.getByText("Score: 25")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Bubble 1 popped" })).toBeDisabled();

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByRole("button", { name: "Pop bubble 1" })).toBeEnabled();

        fireEvent.click(screen.getByRole("button", { name: "Pop bubble 2" }));
        expect(screen.getByText("Score: 26")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Reset Board/i }));
        expect(screen.getByRole("button", { name: "Pop bubble 2" })).toBeEnabled();
    });
});
