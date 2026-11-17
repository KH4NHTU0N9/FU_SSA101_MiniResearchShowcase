import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NudgeSystem } from "@/components/features/nudge-system";

const { pathnameMock, userMock, languageMock, showToastMock } = vi.hoisted(() => ({
    pathnameMock: { current: "/dashboard" },
    userMock: {
        current: { id: "u1", name: "An", email: "an@fpt.edu.vn", phone: null } as null | {
            id: string;
            name: string | null;
            email: string;
            phone: string | null;
        },
    },
    languageMock: { current: "en" as "en" | "vn" },
    showToastMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    usePathname: () => pathnameMock.current,
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({ user: userMock.current }),
}));

vi.mock("@/lib/language-context", () => ({
    useLanguage: () => ({ language: languageMock.current }),
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({ showToast: showToastMock }),
}));

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, className }: { children: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
    },
}));

describe("features/NudgeSystem", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        pathnameMock.current = "/dashboard";
        languageMock.current = "en";
        userMock.current = { id: "u1", name: "An", email: "an@fpt.edu.vn", phone: null };
        showToastMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("triggers periodic positive reminder after 15 minutes, updates frequency, and dismisses", () => {
        render(<NudgeSystem />);

        expect(screen.queryByRole("status")).not.toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(15 * 60 * 1000 + 5000);
        });

        expect(screen.getByRole("status")).toHaveTextContent("Positive Reminder");

        fireEvent.click(screen.getByRole("button", { name: "Reminder frequency settings" }));
        fireEvent.click(screen.getByRole("button", { name: "30m" }));
        expect(showToastMock).toHaveBeenCalledWith("Updated: Reminder every 30 minutes.", "success");

        fireEvent.click(screen.getByRole("button", { name: "Dismiss reminder" }));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("suppresses rendering on login and unauthenticated sessions", () => {
        pathnameMock.current = "/login";
        const { container } = render(<NudgeSystem />);
        expect(container.firstChild).toBeNull();
    });
});
