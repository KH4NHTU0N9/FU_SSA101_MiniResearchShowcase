import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("ui/button", () => {
    it("renders children, variants, sizes, and click handler", () => {
        const onClick = vi.fn();
        render(
            <Button variant="destructive" size="lg" onClick={onClick}>
                Delete Item
            </Button>
        );
        const btn = screen.getByRole("button", { name: "Delete Item" });
        expect(btn.className).toContain("bg-destructive");
        expect(btn.className).toContain("h-11");
        fireEvent.click(btn);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("honors disabled attribute and prevents click interaction", () => {
        const onClick = vi.fn();
        render(
            <Button disabled onClick={onClick}>
                Disabled Action
            </Button>
        );
        const btn = screen.getByRole("button", { name: "Disabled Action" });
        expect(btn).toBeDisabled();
        fireEvent.click(btn);
        expect(onClick).not.toHaveBeenCalled();
    });
});
