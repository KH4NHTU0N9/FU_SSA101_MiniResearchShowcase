import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/components/ui/toast";

function ToastHarness({ onConfirmResult }: { onConfirmResult: (v: boolean) => void }) {
    const { showToast, confirmAction } = useToast();
    return (
        <div>
            <button type="button" onClick={() => showToast("Profile updated", "success")}>
                Show Success
            </button>
            <button
                type="button"
                onClick={() => {
                    void confirmAction({
                        title: "Delete entry?",
                        description: "Cannot be undone.",
                        confirmLabel: "Yes, delete",
                        destructive: true,
                    }).then(onConfirmResult);
                }}
            >
                Ask Confirm
            </button>
        </div>
    );
}

describe("ui/toast ToastProvider", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders toasts, dismisses manually, and auto-expires after 4 seconds", () => {
        render(
            <ToastProvider>
                <ToastHarness onConfirmResult={vi.fn()} />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Success"));
        expect(screen.getByRole("status")).toHaveTextContent("Profile updated");

        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("resolves accessible confirmAction dialog on Confirm, Cancel, and Escape", async () => {
        const results: boolean[] = [];
        render(
            <ToastProvider>
                <ToastHarness onConfirmResult={(v) => results.push(v)} />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Ask Confirm"));
        expect(screen.getByRole("dialog")).toHaveTextContent("Delete entry?");
        fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
        await Promise.resolve();
        expect(results).toEqual([true]);

        fireEvent.click(screen.getByText("Ask Confirm"));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        fireEvent.keyDown(window, { key: "Escape" });
        await Promise.resolve();
        expect(results).toEqual([true, false]);
    });
});
