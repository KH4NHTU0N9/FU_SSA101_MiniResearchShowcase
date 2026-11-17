import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/skeleton";

describe("ui/skeleton", () => {
    it("renders pulse placeholder with custom sizing classes", () => {
        render(<Skeleton data-testid="skel" className="h-12 w-32" />);
        const el = screen.getByTestId("skel");
        expect(el.className).toContain("animate-pulse");
        expect(el.className).toContain("h-12");
        expect(el.className).toContain("w-32");
    });
});
