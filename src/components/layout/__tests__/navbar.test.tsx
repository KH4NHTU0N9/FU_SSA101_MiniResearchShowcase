import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/layout/navbar";
import { LanguageProvider } from "@/lib/language-context";

const { pathnameMock, userMock } = vi.hoisted(() => ({
    pathnameMock: { current: "/dashboard" },
    userMock: {
        current: null as null | {
            id: string;
            name: string | null;
            email: string;
            phone: string | null;
        },
    },
}));

vi.mock("next/navigation", () => ({
    usePathname: () => pathnameMock.current,
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        user: userMock.current,
        logout: vi.fn(),
        refreshUser: vi.fn(),
    }),
}));

describe("layout/Navbar", () => {
    beforeEach(() => {
        localStorage.clear();
        pathnameMock.current = "/dashboard";
        userMock.current = null;
    });

    it("hides navigation bar on landing and authentication routes", () => {
        for (const hiddenRoute of ["/", "/login", "/register", "/verify", "/forgot-password"]) {
            pathnameMock.current = hiddenRoute;
            const { container } = render(
                <LanguageProvider>
                    <Navbar />
                </LanguageProvider>
            );
            expect(container.firstChild).toBeNull();
        }
    });

    it("highlights active route via aria-current='page' and switches Login link to profile menu when authenticated", () => {
        pathnameMock.current = "/dashboard";
        const { rerender } = render(
            <LanguageProvider>
                <Navbar />
            </LanguageProvider>
        );

        expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(screen.getByRole("link", { name: /Login/i })).toHaveAttribute("href", "/login");

        userMock.current = {
            id: "u1",
            name: "An Nguyen",
            email: "an@fpt.edu.vn",
            phone: null,
        };
        rerender(
            <LanguageProvider>
                <Navbar />
            </LanguageProvider>
        );
        expect(screen.queryByRole("link", { name: /Login/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Account menu/i })).toBeInTheDocument();
    });
});
