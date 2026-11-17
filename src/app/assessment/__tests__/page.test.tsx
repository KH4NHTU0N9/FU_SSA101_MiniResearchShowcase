import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssessmentPage from "@/app/assessment/page";

const { pushMock, showToastMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    showToastMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/layout/protected-route", () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({ showToast: showToastMock }),
}));

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, className }: { children: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
    },
}));

describe("app/assessment", () => {
    beforeEach(() => {
        pushMock.mockReset();
        showToastMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("starts assessment, steps through all 21 DASS-21 items, and submits scores", async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "a1" }), { status: 201 }));
        vi.stubGlobal("fetch", fetchMock);

        render(<AssessmentPage />);

        expect(screen.getByText("Mental Health Check")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Start Assessment" }));

        for (let i = 0; i < 21; i++) {
            expect(screen.getByText(`Question ${i + 1} of 21`)).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: "Did not apply to me at all" }));
            if (i < 20) {
                fireEvent.click(screen.getByRole("button", { name: /Next/i }));
            }
        }

        const finishBtn = screen.getByRole("button", { name: /Finish Assessment/i });
        expect(finishBtn).toBeEnabled();
        fireEvent.click(finishBtn);

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith("/api/assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scores: { Depression: 0, Anxiety: 0, Stress: 0 },
                }),
            });
            expect(pushMock).toHaveBeenCalledWith("/assessment/result");
        });
    });

    it("shows destructive alert and error toast when saving fails", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ error: "Database offline" }), { status: 500 }))
        );

        render(<AssessmentPage />);
        fireEvent.click(screen.getByRole("button", { name: "Start Assessment" }));

        for (let i = 0; i < 21; i++) {
            fireEvent.click(screen.getByRole("button", { name: "Did not apply to me at all" }));
            if (i < 20) {
                fireEvent.click(screen.getByRole("button", { name: /Next/i }));
            }
        }

        fireEvent.click(screen.getByRole("button", { name: /Finish Assessment/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Database offline");
        expect(showToastMock).toHaveBeenCalledWith("Database offline", "error");
    });
});
