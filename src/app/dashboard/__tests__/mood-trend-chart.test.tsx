import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MoodTrendChart from "@/app/dashboard/mood-trend-chart";

vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
        <div data-testid="recharts-responsive">{children}</div>
    ),
    ComposedChart: ({ children }: { children: ReactNode }) => (
        <svg data-testid="composed-chart">{children}</svg>
    ),
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    CartesianGrid: () => null,
    Area: ({ name }: { name?: string }) => <text>{name}</text>,
    Line: ({ name }: { name?: string }) => <text>{name}</text>,
}));

describe("app/dashboard/MoodTrendChart", () => {
    it("renders empty state button and invokes onAddCheckIn when history is empty", () => {
        const onAddCheckIn = vi.fn();
        render(<MoodTrendChart history={[]} onAddCheckIn={onAddCheckIn} />);

        expect(screen.getByText("No daily data yet.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Add First Check-in/i }));
        expect(onAddCheckIn).toHaveBeenCalledTimes(1);
    });

    it("renders chart container and mood/focus series when entries are provided", () => {
        render(
            <MoodTrendChart
                history={[
                    {
                        id: "m1",
                        mood: 4,
                        focus: 5,
                        energy: 80,
                        emotion: "excited",
                        createdAt: "2026-03-01T08:00:00.000Z",
                        date: "Sun",
                    },
                ]}
                onAddCheckIn={vi.fn()}
            />
        );

        expect(screen.getByTestId("recharts-responsive")).toBeInTheDocument();
        expect(screen.getByText("Mood Score")).toBeInTheDocument();
        expect(screen.getByText("Focus Level")).toBeInTheDocument();
    });
});
