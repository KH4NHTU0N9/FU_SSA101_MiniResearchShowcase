import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/register/page";
import { LanguageProvider } from "@/lib/language-context";

const { pushMock, registerMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    registerMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        register: registerMock,
    }),
}));

describe("app/register", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        pushMock.mockReset();
        registerMock.mockReset();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("{}", { status: 200 }))
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("validates email and password length on client before calling register", async () => {
        const { container } = render(
            <LanguageProvider>
                <RegisterPage />
            </LanguageProvider>
        );
        const form = container.querySelector("form")!;

        fireEvent.change(screen.getByPlaceholderText("John Doe"), { target: { value: "An" } });
        fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "bad-email" } });
        fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "12345678" } });
        fireEvent.submit(form);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Please enter a valid email address."
        );
        expect(registerMock).not.toHaveBeenCalled();

        fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
            target: { value: "an@fpt.edu.vn" },
        });
        fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
            target: { value: "short" },
        });
        fireEvent.submit(form);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Password must be at least 8 characters long."
        );
        expect(registerMock).not.toHaveBeenCalled();
    });

    it("stores pending_verify_email and redirects to /verify on success", async () => {
        registerMock.mockResolvedValue({
            success: true,
            requireVerification: true,
            email: "an@fpt.edu.vn",
        });

        const { container } = render(
            <LanguageProvider>
                <RegisterPage />
            </LanguageProvider>
        );
        const form = container.querySelector("form")!;

        fireEvent.change(screen.getByPlaceholderText("John Doe"), {
            target: { value: "  Nguyen An  " },
        });
        fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
            target: { value: "  AN@FPT.EDU.VN  " },
        });
        fireEvent.change(screen.getByPlaceholderText("+84901234567"), {
            target: { value: " 0901234567 " },
        });
        fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
            target: { value: "StrongPass1!" },
        });
        fireEvent.submit(form);

        await waitFor(() => {
            expect(registerMock).toHaveBeenCalledWith(
                "Nguyen An",
                "an@fpt.edu.vn",
                "0901234567",
                "StrongPass1!"
            );
            expect(sessionStorage.getItem("pending_verify_email")).toBe("an@fpt.edu.vn");
            expect(pushMock).toHaveBeenCalledWith("/verify?email=an%40fpt.edu.vn");
        });
    });
});
