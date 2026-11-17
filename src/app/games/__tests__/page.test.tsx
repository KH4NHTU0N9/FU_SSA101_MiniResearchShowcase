import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GamesPage from "@/app/games/page";

vi.mock("@/components/features/stress-games-hub", () => ({
    StressGamesHub: () => <div data-testid="games-hub" />,
}));

describe("app/games", () => {
    it("renders Stress Relief Games heading and mounts StressGamesHub", () => {
        render(<GamesPage />);

        expect(screen.getByRole("heading", { name: "Stress Relief Games" })).toBeInTheDocument();
        expect(screen.getByTestId("games-hub")).toBeInTheDocument();
    });
});
