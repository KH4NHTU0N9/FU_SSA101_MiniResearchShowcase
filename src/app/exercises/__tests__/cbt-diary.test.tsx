import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExercisesPage from "@/app/exercises/page";

const { showToastMock, confirmActionMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
    confirmActionMock: vi.fn(),
}));

vi.mock("@/components/layout/protected-route", () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({
        showToast: showToastMock,
        confirmAction: confirmActionMock,
    }),
}));

describe("app/exercises/cbt-diary", () => {
    beforeEach(() => {
        localStorage.clear();
        showToastMock.mockReset();
        confirmActionMock.mockReset();
    });

    it("validates required CBT fields, persists journal entry to localStorage, and deletes entry", async () => {
        confirmActionMock.mockResolvedValue(true);
        render(<ExercisesPage />);

        fireEvent.click(screen.getByRole("tab", { name: "Thinking Diary" }));

        fireEvent.click(screen.getByRole("button", { name: "Save to Diary" }));
        expect(showToastMock).toHaveBeenCalledWith(
            "Please complete at least the situation and balanced thought.",
            "error"
        );

        fireEvent.change(screen.getByLabelText(/The Situation/i), {
            target: { value: "Missed quiz" },
        });
        fireEvent.change(screen.getByLabelText(/Automatic Negative Thought/i), {
            target: { value: "I am behind everything" },
        });
        fireEvent.change(screen.getByLabelText(/Balanced \/ Alternative Thought/i), {
            target: { value: "One quiz does not define the course" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save to Diary" }));

        expect(showToastMock).toHaveBeenCalledWith(
            "Thinking diary saved. Great job reframing that thought!",
            "success"
        );
        expect(await screen.findByText("Missed quiz")).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem("cbtJournal") || "[]")).toHaveLength(1);

        fireEvent.click(screen.getByRole("button", { name: "Delete diary entry" }));
        await waitFor(() => {
            expect(confirmActionMock).toHaveBeenCalledTimes(1);
            expect(screen.queryByText("Missed quiz")).not.toBeInTheDocument();
        });
    });
});
