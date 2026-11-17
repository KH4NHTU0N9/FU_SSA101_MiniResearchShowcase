import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "@/components/ui/progress";

describe("ui/progress", () => {
    it("exposes accessible progressbar ARIA attributes and clamps values cleanly in [0, 100]", () => {
        const { rerender } = render(<Progress value={62.6} />);
        let bar = screen.getByRole("progressbar");
        expect(bar).toHaveAttribute("aria-valuemin", "0");
        expect(bar).toHaveAttribute("aria-valuemax", "100");
        expect(bar).toHaveAttribute("aria-valuenow", "63");

        rerender(<Progress value={-15} />);
        bar = screen.getByRole("progressbar");
        expect(bar).toHaveAttribute("aria-valuenow", "0");

        rerender(<Progress value={145} />);
        bar = screen.getByRole("progressbar");
        expect(bar).toHaveAttribute("aria-valuenow", "100");
    });
});
