import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { LanguageProvider } from "@/lib/language-context";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

describe("app/Home landing page", () => {
    beforeEach(() => {
        localStorage.clear();
        getSessionMock.mockReset();
    });

    it("renders Sign In & Get Started links for unauthenticated visitors", async () => {
        getSessionMock.mockResolvedValue(null);
        const ui = await Home();
        render(<LanguageProvider>{ui}</LanguageProvider>);

        expect(screen.getByRole("button", { name: "Sign In" }).closest("a")).toHaveAttribute(
            "href",
            "/login"
        );
        expect(
            screen.getByRole("button", { name: /Start Your Journey/i }).closest("a")
        ).toHaveAttribute("href", "/register");
    });

    it("renders Go to Dashboard CTA when an authenticated session is active", async () => {
        getSessionMock.mockResolvedValue({ user: { id: "u1" } });
        const ui = await Home();
        render(<LanguageProvider>{ui}</LanguageProvider>);

        const dashButtons = screen.getAllByRole("button", { name: /Go to Dashboard/i });
        expect(dashButtons.length).toBeGreaterThanOrEqual(1);
        expect(dashButtons[0].closest("a")).toHaveAttribute("href", "/dashboard");
    });
});
