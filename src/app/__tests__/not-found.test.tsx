import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

describe("app/not-found NotFound", () => {
    it("renders 404 heading and navigation links back to Home and Dashboard", () => {
        render(<NotFound />);
        expect(
            screen.getByRole("heading", { name: /404 – Page Not Found/i })
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Back to Home" }).closest("a")).toHaveAttribute(
            "href",
            "/"
        );
        expect(screen.getByRole("button", { name: "Dashboard" }).closest("a")).toHaveAttribute(
            "href",
            "/dashboard"
        );
    });
});
