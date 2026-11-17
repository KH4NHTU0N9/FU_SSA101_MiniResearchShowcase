import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const { pushMock, refreshMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: pushMock,
        refresh: refreshMock,
    }),
}));

describe("lib/auth-context AuthProvider", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        pushMock.mockReset();
        refreshMock.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("hydrates current user from /api/auth/me and signs in via /api/auth/login", async () => {
        fetchMock
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ user: null }), { status: 200 })
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        user: {
                            id: "u1",
                            email: "student@fpt.edu.vn",
                            name: "Student",
                            phone: null,
                        },
                    }),
                    { status: 200 }
                )
            );

        const { result } = renderHook(() => useAuth(), {
            wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.isAuthenticated).toBe(false);

        let loginResult: Awaited<ReturnType<typeof result.current.login>> | undefined;
        await act(async () => {
            loginResult = await result.current.login("student@fpt.edu.vn", "Password123!");
        });

        expect(loginResult?.success).toBe(true);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.id).toBe("u1");
        expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });

    it("clears user state and stale localStorage keys on logout", async () => {
        localStorage.setItem("cbtJournal", "stale");
        fetchMock
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        user: {
                            id: "u1",
                            email: "a@b.com",
                            name: "User",
                            phone: null,
                        },
                    }),
                    { status: 200 }
                )
            )
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

        const { result } = renderHook(() => useAuth(), {
            wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
        });

        await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

        await act(async () => {
            await result.current.logout();
        });

        expect(result.current.user).toBeNull();
        expect(localStorage.getItem("cbtJournal")).toBeNull();
        expect(pushMock).toHaveBeenCalledWith("/login");
    });
});
