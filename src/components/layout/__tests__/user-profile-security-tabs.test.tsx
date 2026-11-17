import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserProfileDropdown } from "@/components/layout/user-profile-dropdown";

const { refreshUserMock } = vi.hoisted(() => ({
    refreshUserMock: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        user: {
            id: "u1",
            name: "An Nguyen",
            email: "an@fpt.edu.vn",
            phone: "0901234567",
        },
        logout: vi.fn(),
        refreshUser: refreshUserMock,
    }),
}));

describe("layout/UserProfileDropdown Security Tabs", () => {
    beforeEach(() => {
        refreshUserMock.mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("validates password mismatch/length and completes 2-step email verification rotation in Security modal", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ pendingVerification: true }), { status: 200 })
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({ user: { id: "u1", email: "new@fpt.edu.vn" } }),
                    { status: 200 }
                )
            );
        vi.stubGlobal("fetch", fetchMock);

        render(<UserProfileDropdown />);

        fireEvent.click(screen.getByRole("button", { name: /Account menu/i }));
        fireEvent.click(screen.getByRole("menuitem", { name: "Security" }));

        fireEvent.change(
            screen.getByText("Current Password").parentElement!.querySelector("input")!,
            { target: { value: "OldPassword1" } }
        );
        fireEvent.change(
            screen.getByText("New Password").parentElement!.querySelector("input")!,
            { target: { value: "short" } }
        );
        fireEvent.change(
            screen.getByText("Confirm New Password").parentElement!.querySelector("input")!,
            { target: { value: "short" } }
        );
        fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "New password must be at least 8 characters"
        );

        fireEvent.click(screen.getByRole("button", { name: "Email" }));
        fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
            target: { value: "new@fpt.edu.vn" },
        });
        fireEvent.change(
            screen.getByText("Current Password (to confirm)").parentElement!.querySelector("input")!,
            { target: { value: "OldPassword1" } }
        );
        fireEvent.click(screen.getByRole("button", { name: "Send Verification Code" }));

        expect(await screen.findByPlaceholderText("123456")).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText("123456"), { target: { value: "987654" } });
        fireEvent.click(screen.getByRole("button", { name: "Confirm Email" }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(refreshUserMock).toHaveBeenCalledTimes(1);
        });

        fireEvent.click(screen.getByRole("button", { name: "2FA" }));
        expect(screen.getByText("Two-Factor Authentication (2FA)")).toBeInTheDocument();
    });
});
