import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbientGame } from "@/components/features/games/ambient-game";

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
        div: ({
            children,
            className,
            style,
        }: {
            children?: ReactNode;
            className?: string;
            style?: Record<string, unknown>;
        }) => (
            <div className={className} style={style}>
                {children}
            </div>
        ),
    },
}));

describe("features/games/AmbientGame", () => {
    const startMock = vi.fn();
    const stopMock = vi.fn();
    const closeMock = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        startMock.mockReset();
        stopMock.mockReset();
        closeMock.mockClear();

        vi.stubGlobal(
            "AudioContext",
            class MockAudioContext {
                state = "running";
                currentTime = 0;
                destination = {};
                resume = vi.fn().mockResolvedValue(undefined);
                close = closeMock;
                createOscillator = () => ({
                    type: "sine",
                    frequency: { setValueAtTime: vi.fn() },
                    connect: vi.fn(),
                    start: startMock,
                    stop: stopMock,
                });
                createGain = () => ({
                    gain: {
                        setValueAtTime: vi.fn(),
                        linearRampToValueAtTime: vi.fn(),
                        exponentialRampToValueAtTime: vi.fn(),
                    },
                    connect: vi.fn(),
                });
            }
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("synthesizes pentatonic notes on pointer/keyboard interaction and toggles mute", () => {
        const { unmount } = render(<AmbientGame />);

        const canvas = screen.getByRole("button", { name: "Interactive ambient sound canvas" });
        fireEvent.click(canvas, { clientX: 40, clientY: 120 });
        expect(startMock).toHaveBeenCalledTimes(1);

        const muteBtn = screen.getByRole("button", { name: "Mute sound" });
        fireEvent.click(muteBtn);
        expect(screen.getByRole("button", { name: "Unmute sound" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        fireEvent.keyDown(canvas, { key: " " });
        expect(startMock).toHaveBeenCalledTimes(1);

        unmount();
        expect(closeMock).toHaveBeenCalledTimes(1);
    });
});
