import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrisisFloatingButton } from "@/components/features/crisis-button";

const { pathnameMock, userMock } = vi.hoisted(() => ({
    pathnameMock: { current: "/dashboard" },
    userMock: {
        current: { id: "u1", name: "An", email: "an@fpt.edu.vn", phone: null } as null | {
            id: string;
            name: string | null;
            email: string;
            phone: string | null;
        },
    },
}));

vi.mock("next/navigation", () => ({
    usePathname: () => pathnameMock.current,
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({ user: userMock.current }),
}));

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
        div: ({
            children,
            className,
            role,
            "aria-modal": ariaModal,
            "aria-labelledby": ariaLabelledBy,
        }: {
            children: ReactNode;
            className?: string;
            role?: string;
            "aria-modal"?: boolean;
            "aria-labelledby"?: string;
        }) => (
            <div
                className={className}
                role={role}
                aria-modal={ariaModal}
                aria-labelledby={ariaLabelledBy}
            >
                {children}
            </div>
        ),
    },
}));

describe("features/CrisisFloatingButton", () => {
    beforeEach(() => {
        pathnameMock.current = "/dashboard";
        userMock.current = { id: "u1", name: "An", email: "an@fpt.edu.vn", phone: null };
    });

    it("hides when unauthenticated or on auth pages", () => {
        userMock.current = null;
        const { container, rerender } = render(<CrisisFloatingButton />);
        expect(container.firstChild).toBeNull();

        userMock.current = { id: "u1", name: "An", email: "an@fpt.edu.vn", phone: null };
        pathnameMock.current = "/login";
        rerender(<CrisisFloatingButton />);
        expect(container.firstChild).toBeNull();
    });

    it("renders crisis help floating button and opens support modal on click", () => {
        render(<CrisisFloatingButton />);

        fireEvent.click(screen.getByRole("button", { name: "Emergency support and crisis helpline" }));
        expect(screen.getByRole("dialog")).toHaveTextContent("We are here for you.");
    });
});
