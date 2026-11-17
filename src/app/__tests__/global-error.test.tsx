import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "@/app/global-error";

describe("app/global-error GlobalError", () => {
    it("renders critical fallback UI without leaking sensitive details and invokes reset", () => {
        const reset = vi.fn();
        vi.spyOn(console, "error").mockImplementation(() => {});
        const err = Object.assign(new Error("Secret DB stack"), { digest: "err-999" });

        render(<GlobalError error={err} reset={reset} />);

        expect(screen.getByText("Critical Application Error")).toBeInTheDocument();
        expect(screen.queryByText("Secret DB stack")).not.toBeInTheDocument();
        expect(screen.getByText("Reference: err-999")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Reload Application" }));
        expect(reset).toHaveBeenCalledTimes(1);
    });
});
