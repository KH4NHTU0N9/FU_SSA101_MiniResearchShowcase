import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

describe("ui/dialog", () => {
    it("opens via DialogTrigger and closes via labeled Close button", () => {
        const onOpenChange = vi.fn();
        render(
            <Dialog onOpenChange={onOpenChange}>
                <DialogTrigger asChild>
                    <button type="button">Open Dialog</button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Action</DialogTitle>
                        <DialogDescription>Dialog body details</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );

        fireEvent.click(screen.getByRole("button", { name: "Open Dialog" }));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Confirm Action")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });
});
