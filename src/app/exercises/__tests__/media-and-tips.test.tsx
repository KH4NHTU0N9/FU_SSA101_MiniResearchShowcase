import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("app/exercises/media-and-tips", () => {
    it("renders embedded relaxation media iframes and study technique cards", () => {
        render(<ExercisesPage />);

        fireEvent.click(screen.getByRole("tab", { name: "Relaxation Media" }));
        expect(screen.getByTitle("White Noise")).toHaveAttribute(
            "src",
            "https://www.youtube.com/embed/nMfPqeZjc2c"
        );
        expect(screen.getByTitle("Box Breathing")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("tab", { name: "Study Tips" }));
        expect(screen.getByText("Pomodoro Technique")).toBeInTheDocument();
        expect(screen.getByText("Feynman Method")).toBeInTheDocument();
        expect(screen.getByText("Spaced Repetition (SRS)")).toBeInTheDocument();
    });
});
