import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/forgot-password/page";

const { pushMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

describe("app/forgot-password", () => {
    beforeEach(() => {
        pushMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("walks through step 1 email code request, client password validation, and step 2 password reset", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ message: "Reset code sent." }), { status: 200 })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ message: "Password updated" }), { status: 200 })
            );
        vi.stubGlobal("fetch", fetchMock);

        const { container } = render(<ForgotPasswordPage />);

        fireEvent.change(screen.getByLabelText("Email Address"), {
            target: { value: "  USER@FPT.EDU.VN  " },
        });
        fireEvent.submit(container.querySelector("form")!);

        expect(await screen.findByText("Reset code sent.")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "user@fpt.edu.vn" }),
        });

        fireEvent.change(screen.getByLabelText("6-Digit Reset Code"), { target: { value: "654321" } });
        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "short" } });
        fireEvent.submit(container.querySelector("form")!);

        expect(
            await screen.findByText("Password must be at least 8 characters.")
        ).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "NewStrongPass9!" } });
        fireEvent.submit(container.querySelector("form")!);

        await waitFor(() => {
            expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "user@fpt.edu.vn",
                    code: "654321",
                    newPassword: "NewStrongPass9!",
                }),
            });
            expect(pushMock).toHaveBeenCalledWith("/login?verified=true");
        });
    });
});
