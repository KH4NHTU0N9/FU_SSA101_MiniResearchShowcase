import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExercisesPage from "@/app/exercises/page";

vi.mock("@/components/layout/protected-route", () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({
        showToast: vi.fn(),
        confirmAction: vi.fn(),
    }),
}));

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, className }: { children: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
    },
}));

describe("app/exercises/breathing", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("cycles through inhale (4s), hold (7s), and exhale (8s) phases and resets on stop", () => {
        render(<ExercisesPage />);

        expect(screen.getByText("Ready")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Start Exercise" }));
        expect(screen.getByText("inhale")).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(screen.getByText("hold")).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(7000);
        });
        expect(screen.getByText("exhale")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Stop" }));
        expect(screen.getByText("Ready")).toBeInTheDocument();
    });
});
