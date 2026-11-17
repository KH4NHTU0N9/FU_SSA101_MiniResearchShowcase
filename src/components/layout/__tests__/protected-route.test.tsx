import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "@/components/layout/protected-route";

const { replaceMock, authState } = vi.hoisted(() => ({
    replaceMock: vi.fn(),
    authState: { isAuthenticated: false, loading: true },
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => authState,
}));

describe("layout/ProtectedRoute", () => {
    beforeEach(() => {
        replaceMock.mockReset();
        authState.isAuthenticated = false;
        authState.loading = true;
    });

    it("renders loading status while auth state resolves", () => {
        render(
            <ProtectedRoute>
                <div>Private Content</div>
            </ProtectedRoute>
        );
        expect(screen.getByRole("status")).toHaveTextContent("Loading...");
        expect(screen.queryByText("Private Content")).not.toBeInTheDocument();
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it("redirects unauthenticated users to /login and renders children when authenticated", () => {
        authState.loading = false;
        authState.isAuthenticated = false;
        const { rerender } = render(
            <ProtectedRoute>
                <div>Private Content</div>
            </ProtectedRoute>
        );
        expect(replaceMock).toHaveBeenCalledWith("/login");
        expect(screen.queryByText("Private Content")).not.toBeInTheDocument();

        authState.isAuthenticated = true;
        rerender(
            <ProtectedRoute>
                <div>Private Content</div>
            </ProtectedRoute>
        );
        expect(screen.getByText("Private Content")).toBeInTheDocument();
    });
});
