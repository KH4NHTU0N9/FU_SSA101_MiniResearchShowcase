import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
    cleanup();
});

if (typeof window !== "undefined") {
    if (!window.matchMedia) {
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    }

    if (!globalThis.ResizeObserver) {
        globalThis.ResizeObserver = class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }

    if (!HTMLElement.prototype.scrollIntoView) {
        HTMLElement.prototype.scrollIntoView = vi.fn();
    }

    if (!URL.createObjectURL) {
        URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-preview");
    }
    if (!URL.revokeObjectURL) {
        URL.revokeObjectURL = vi.fn();
    }
}

if (typeof HTMLMediaElement !== "undefined") {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
}
