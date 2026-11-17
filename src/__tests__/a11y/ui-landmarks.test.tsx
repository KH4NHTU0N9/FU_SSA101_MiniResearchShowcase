import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/layout/navbar";
import { ProfessionalHelpModal } from "@/components/features/professional-help-modal";
import { LanguageProvider } from "@/lib/language-context";

vi.mock("next/navigation", () => ({
    usePathname: () => "/dashboard",
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        user: { id: "u1", name: "An", email: "an@fpt.edu.vn", phone: null },
        logout: vi.fn(),
        refreshUser: vi.fn(),
    }),
}));

describe("a11y/ui-landmarks", () => {
    it("exposes accessible navigation landmark, active current-page link, and aria-modal dialogs", () => {
        render(
            <LanguageProvider>
                <Navbar />
                <ProfessionalHelpModal open={true} onOpenChange={vi.fn()} reason="manual" />
            </LanguageProvider>
        );

        const nav = screen.getByRole("navigation");
        expect(nav).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute(
            "aria-current",
            "page"
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-modal", "true");
        expect(dialog).toHaveAttribute("aria-labelledby", "help-modal-title");
        expect(
            screen.getByRole("button", { name: "Close crisis support modal" })
        ).toBeInTheDocument();
    });
});
