import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResultPage from "@/app/assessment/result/page";

vi.mock("@/components/layout/protected-route", () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/features/professional-help-modal", () => ({
    ProfessionalHelpModal: ({ open, reason }: { open: boolean; reason?: string }) =>
        open ? <div data-testid="help-modal" data-reason={reason} /> : null,
}));

vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
        <div data-testid="recharts-container">{children}</div>
    ),
    BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Cell: () => null,
}));

describe("app/assessment/result", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders empty prompt when user has no stored assessment", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("null", { status: 200 }))
        );

        render(<ResultPage />);

        expect(await screen.findByText("No Assessment Found")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Take Assessment Now" })).toHaveAttribute(
            "href",
            "/assessment"
        );
    });

    it("displays error card when /api/assessment responds with failure status", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ error: "fail" }), { status: 500 }))
        );

        render(<ResultPage />);
        expect(await screen.findByText("Unable to load assessment results.")).toBeInTheDocument();
    });

    it("renders DASS-21 breakdown and opens high-risk support modal when scores breach threshold", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                new Response(
                    JSON.stringify({
                        id: "a1",
                        createdAt: "2026-03-01T10:00:00.000Z",
                        depressionScore: 15,
                        anxietyScore: 6,
                        stressScore: 8,
                    }),
                    { status: 200 }
                )
            )
        );

        render(<ResultPage />);

        expect(await screen.findByText("Your Mental Health Profile")).toBeInTheDocument();
        expect(screen.getByText("Score: 15 / 21")).toBeInTheDocument();
        expect(screen.getAllByText("Extremely Severe")).toHaveLength(2);
        await waitFor(() => {
            expect(screen.getByTestId("help-modal")).toHaveAttribute("data-reason", "score");
        });
    });
});
