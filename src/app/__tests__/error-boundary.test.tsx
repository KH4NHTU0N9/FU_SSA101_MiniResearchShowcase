import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlobalAppError from "@/app/error";

describe("app/error GlobalAppError boundary", () => {
    it("displays error reference digest and calls reset callback on retry", () => {
        const reset = vi.fn();
        vi.spyOn(console, "error").mockImplementation(() => {});
        const err = Object.assign(new Error("Render crash"), { digest: "dig-123" });

        render(<GlobalAppError error={err} reset={reset} />);

        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText("Reference: dig-123")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Home" }).closest("a")).toHaveAttribute(
            "href",
            "/"
        );

        fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
        expect(reset).toHaveBeenCalledTimes(1);
    });
});
