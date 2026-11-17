import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "@/components/features/focus-timer";

const { showToastMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({ showToast: showToastMock }),
}));

describe("features/FocusTimer", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        showToastMock.mockReset();
        vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
        vi.stubGlobal(
            "Audio",
            class MockAudio {
                play = vi.fn().mockResolvedValue(undefined);
            }
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("requires objective before starting, counts down custom minutes, and pauses in Strict Mode on hidden tab", () => {
        render(<FocusTimer />);

        fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
        expect(showToastMock).toHaveBeenCalledWith("Please enter a focus objective first.", "info");

        fireEvent.change(screen.getByLabelText("Focus objective"), {
            target: { value: "Solve OS Assignment" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Custom" }));
        fireEvent.change(screen.getByLabelText("Duration (min):"), { target: { value: "1" } });
        expect(screen.getByRole("timer")).toHaveTextContent("01:00");

        fireEvent.click(screen.getByRole("button", { name: "Enable strict mode" }));
        fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(screen.getByRole("timer")).toHaveTextContent("00:55");

        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        fireEvent(document, new Event("visibilitychange"));
        expect(showToastMock).toHaveBeenCalledWith(
            "Strict Mode paused your timer because you switched tabs.",
            "info"
        );

        Object.defineProperty(document, "hidden", { configurable: true, value: false });
        fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
        act(() => {
            vi.advanceTimersByTime(55000);
        });
        expect(screen.getByRole("timer")).toHaveTextContent("00:00");
        expect(showToastMock).toHaveBeenCalledWith("Focus session complete!", "success");
    });

    it("switches Pomodoro presets cleanly", () => {
        render(<FocusTimer />);
        expect(screen.getByRole("timer")).toHaveTextContent("25:00");

        fireEvent.click(screen.getByRole("button", { name: "Short Break" }));
        expect(screen.getByRole("timer")).toHaveTextContent("05:00");

        fireEvent.click(screen.getByRole("button", { name: "Long Break" }));
        expect(screen.getByRole("timer")).toHaveTextContent("15:00");
    });
});
