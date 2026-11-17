import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "@/lib/language-context";

function ConsumerProbe() {
    const { language, setLanguage, t } = useLanguage();
    return (
        <div>
            <span data-testid="lang">{language}</span>
            <span data-testid="label">{t("nav_dashboard")}</span>
            <button type="button" onClick={() => setLanguage("vn")}>
                Switch VN
            </button>
            <button type="button" onClick={() => setLanguage("en")}>
                Switch EN
            </button>
        </div>
    );
}

describe("lib/language-context LanguageProvider", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("defaults to en, switches locales, and persists preference in localStorage", () => {
        render(
            <LanguageProvider>
                <ConsumerProbe />
            </LanguageProvider>
        );

        expect(screen.getByTestId("lang")).toHaveTextContent("en");
        expect(screen.getByTestId("label")).toHaveTextContent("Dashboard");

        fireEvent.click(screen.getByText("Switch VN"));
        expect(screen.getByTestId("lang")).toHaveTextContent("vn");
        expect(localStorage.getItem("app_language")).toBe("vn");

        fireEvent.click(screen.getByText("Switch EN"));
        expect(screen.getByTestId("lang")).toHaveTextContent("en");
        expect(localStorage.getItem("app_language")).toBe("en");
    });

    it("throws descriptive error when useLanguage is called outside LanguageProvider", () => {
        expect(() => render(<ConsumerProbe />)).toThrow(/LanguageProvider/);
    });
});
