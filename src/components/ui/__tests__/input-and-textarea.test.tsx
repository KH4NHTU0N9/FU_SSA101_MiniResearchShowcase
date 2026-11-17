import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

describe("ui/input and ui/textarea", () => {
    it("forwards HTML attributes and change events for Input and Textarea", () => {
        const onInputChange = vi.fn();
        const onTextChange = vi.fn();

        render(
            <>
                <Input
                    aria-label="Email input"
                    type="email"
                    placeholder="user@fpt.edu.vn"
                    onChange={onInputChange}
                />
                <Textarea
                    aria-label="Notes textarea"
                    placeholder="Write reflection..."
                    onChange={onTextChange}
                />
            </>
        );

        const input = screen.getByLabelText("Email input");
        expect(input).toHaveAttribute("type", "email");
        fireEvent.change(input, { target: { value: "abc@fpt.edu.vn" } });
        expect(onInputChange).toHaveBeenCalledTimes(1);

        const textarea = screen.getByLabelText("Notes textarea");
        fireEvent.change(textarea, { target: { value: "Feeling calmer" } });
        expect(onTextChange).toHaveBeenCalledTimes(1);
    });
});
