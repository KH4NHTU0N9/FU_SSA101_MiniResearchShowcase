import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VerifyPage from "@/app/verify/page";

const { pushMock, searchParamsMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    searchParamsMock: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => searchParamsMock.current,
}));

describe("app/verify", () => {
    beforeEach(() => {
        sessionStorage.clear();
        pushMock.mockReset();
        searchParamsMock.current = new URLSearchParams();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("preloads email from sessionStorage, filters code digits, and verifies account", async () => {
        sessionStorage.setItem("pending_verify_email", "pending@fpt.edu.vn");
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        render(<VerifyPage />);

        const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
        expect(emailInput.value).toBe("pending@fpt.edu.vn");

        const codeInput = screen.getByLabelText("6-Digit Verification Code") as HTMLInputElement;
        const submitBtn = screen.getByRole("button", { name: /Verify Account/i });
        expect(submitBtn).toBeDisabled();

        fireEvent.change(codeInput, { target: { value: "12a34b56" } });
        expect(codeInput.value).toBe("123456");
        expect(submitBtn).toBeEnabled();

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "pending@fpt.edu.vn", code: "123456" }),
            });
            expect(sessionStorage.getItem("pending_verify_email")).toBeNull();
            expect(pushMock).toHaveBeenCalledWith("/login?verified=true");
        });
    });

    it("renders server error when verification code is rejected", async () => {
        searchParamsMock.current = new URLSearchParams("email=an@fpt.edu.vn");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ error: "Invalid verification code" }), { status: 400 }))
        );

        render(<VerifyPage />);
        fireEvent.change(screen.getByLabelText("6-Digit Verification Code"), { target: { value: "000000" } });
        fireEvent.click(screen.getByRole("button", { name: /Verify Account/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Invalid verification code");
        expect(pushMock).not.toHaveBeenCalled();
    });
});
