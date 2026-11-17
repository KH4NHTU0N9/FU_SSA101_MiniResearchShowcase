import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { LanguageProvider } from "@/lib/language-context";

describe("layout/LanguageToggle", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("toggles between EN and VN and updates aria-label and localStorage", () => {
        render(
            <LanguageProvider>
                <LanguageToggle />
            </LanguageProvider>
        );

        const button = screen.getByRole("button", { name: /: EN$/i });
        expect(button).toHaveTextContent("EN");

        fireEvent.click(button);
        expect(screen.getByRole("button", { name: /: VN$/i })).toHaveTextContent("VN");
        expect(localStorage.getItem("app_language")).toBe("vn");
    });
});
