import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { LanguageProvider } from "@/lib/language-context";

const { loginMock, searchParamsMock } = vi.hoisted(() => ({
    loginMock: vi.fn(),
    searchParamsMock: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => searchParamsMock.current,
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        login: loginMock,
    }),
}));

describe("app/login", () => {
    beforeEach(() => {
        localStorage.clear();
        loginMock.mockReset();
        searchParamsMock.current = new URLSearchParams();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("{}", { status: 200 }))
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders verified banner from query param and submits trimmed credentials", async () => {
        searchParamsMock.current = new URLSearchParams("verified=true");
        loginMock.mockResolvedValue({ success: true });

        render(
            <LanguageProvider>
                <LoginPage />
            </LanguageProvider>
        );

        expect(screen.getByText("Account verified! Please sign in.")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/Email or Phone/i), {
            target: { value: "  student@fpt.edu.vn  " },
        });
        fireEvent.change(screen.getByLabelText(/Password/i), {
            target: { value: "SecretPass123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

        await waitFor(() => {
            expect(loginMock).toHaveBeenCalledWith("student@fpt.edu.vn", "SecretPass123");
        });
    });

    it("shows destructive alert when login fails", async () => {
        loginMock.mockResolvedValue({ success: false, error: "Invalid credentials" });

        render(
            <LanguageProvider>
                <LoginPage />
            </LanguageProvider>
        );

        fireEvent.change(screen.getByLabelText(/Email or Phone/i), {
            target: { value: "0901234567" },
        });
        fireEvent.change(screen.getByLabelText(/Password/i), {
            target: { value: "wrongpass1" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
    });
});
