import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "@/components/ui/label";

describe("ui/label", () => {
    it("associates Radix label cleanly with target control via htmlFor", () => {
        render(
            <div>
                <Label htmlFor="study-goal">Study Goal</Label>
                <input id="study-goal" type="text" />
            </div>
        );
        expect(screen.getByLabelText("Study Goal")).toHaveAttribute("id", "study-goal");
    });
});
