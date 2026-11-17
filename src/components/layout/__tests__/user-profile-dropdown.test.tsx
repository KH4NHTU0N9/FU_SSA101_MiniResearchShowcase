import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserProfileDropdown } from "@/components/layout/user-profile-dropdown";

const { logoutMock, refreshUserMock, authState } = vi.hoisted(() => ({
    logoutMock: vi.fn(),
    refreshUserMock: vi.fn(),
    authState: {
        user: {
            id: "u1",
            name: "Nguyen Van An",
            email: "an@fpt.edu.vn",
            phone: "0901234567",
        } as null | { id: string; name: string | null; email: string; phone: string | null },
    },
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        user: authState.user,
        logout: logoutMock,
        refreshUser: refreshUserMock,
    }),
}));

describe("layout/UserProfileDropdown", () => {
    beforeEach(() => {
        logoutMock.mockReset();
        refreshUserMock.mockReset();
        authState.user = {
            id: "u1",
            name: "Nguyen Van An",
            email: "an@fpt.edu.vn",
            phone: "0901234567",
        };
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                new Response(JSON.stringify({ user: authState.user }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            )
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("opens account menu popover, opens Personal Info dialog, and invokes logout", async () => {
        render(<UserProfileDropdown />);

        const trigger = screen.getByRole("button", { name: /Account menu/i });
        expect(trigger).toHaveTextContent("NV");

        fireEvent.click(trigger);
        expect(screen.getByRole("menu")).toBeInTheDocument();
        expect(screen.getByText("an@fpt.edu.vn")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("menuitem", { name: "Personal Info" }));
        expect(screen.getByRole("dialog")).toHaveTextContent("Personal Info");
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/auth/profile",
                expect.objectContaining({ signal: expect.any(AbortSignal) })
            );
        });
        expect(await screen.findByDisplayValue("Nguyen Van An")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        fireEvent.click(trigger);
        fireEvent.click(screen.getByRole("menuitem", { name: "Log Out" }));
        expect(logoutMock).toHaveBeenCalledTimes(1);
    });

    it("renders nothing when user is null", () => {
        authState.user = null;
        const { container } = render(<UserProfileDropdown />);
        expect(container.firstChild).toBeNull();
    });
});
