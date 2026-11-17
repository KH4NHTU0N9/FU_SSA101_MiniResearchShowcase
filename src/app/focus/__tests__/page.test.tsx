import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FocusPage from "@/app/focus/page";

vi.mock("@/components/layout/protected-route", () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({ showToast: vi.fn() }),
}));

describe("app/focus", () => {
    it("renders Exit Focus Mode link back to dashboard and mounts FocusTimer section", () => {
        render(<FocusPage />);

        expect(screen.getByRole("link", { name: /Exit Focus Mode/i })).toHaveAttribute(
            "href",
            "/dashboard"
        );
        expect(screen.getByRole("region", { name: "Focus timer" })).toBeInTheDocument();
        expect(screen.getByRole("timer")).toHaveTextContent("25:00");
    });
});
