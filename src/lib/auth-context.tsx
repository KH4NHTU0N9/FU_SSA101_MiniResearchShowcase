"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthActionResult, PublicUser } from "@/types";

interface AuthContextType {
    user: PublicUser | null;
    login: (identifier: string, password: string) => Promise<AuthActionResult>;
    register: (
        name: string,
        email: string,
        phone: string,
        password: string
    ) => Promise<AuthActionResult & { email?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STALE_STORAGE_KEYS = [
    "chat_history",
    "psych-flashcards",
    "scheduler_fixed",
    "scheduler_tasks",
    "forumPosts_clean",
    "cbtJournal",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const refreshUser = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await fetch("/api/auth/me", { signal, cache: "no-store" });
            if (!res.ok) {
                setUser(null);
                return;
            }
            const data = (await res.json()) as { user?: PublicUser | null };
            setUser(data.user ?? null);
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                console.error("Session check failed:", err);
                setUser(null);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        refreshUser(controller.signal).finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [refreshUser]);

    const login = useCallback(
        async (identifier: string, password: string): Promise<AuthActionResult> => {
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier, password }),
                });

                const data = (await res.json().catch(() => ({}))) as {
                    user?: PublicUser;
                    error?: string;
                };

                if (!res.ok || !data.user) {
                    return { success: false, error: data.error || "Invalid credentials" };
                }

                setUser(data.user);
                router.push("/dashboard");
                router.refresh();
                return { success: true };
            } catch {
                return { success: false, error: "Network error. Please try again." };
            }
        },
        [router]
    );

    const register = useCallback(
        async (
            name: string,
            email: string,
            phone: string,
            password: string
        ): Promise<AuthActionResult & { email?: string }> => {
            try {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, phone, password }),
                });

                const data = (await res.json().catch(() => ({}))) as {
                    error?: string;
                    requireVerification?: boolean;
                    email?: string;
                    user?: PublicUser;
                };

                if (!res.ok) {
                    return { success: false, error: data.error || "Registration failed" };
                }

                if (data.requireVerification) {
                    return {
                        success: true,
                        requireVerification: true,
                        email: data.email || email.trim().toLowerCase(),
                    };
                }

                if (data.user) {
                    setUser(data.user);
                    router.push("/dashboard");
                    router.refresh();
                }

                return { success: true };
            } catch {
                return { success: false, error: "Network error" };
            }
        },
        [router]
    );

    const logout = useCallback(async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (err) {
            console.error("Logout request failed:", err);
        } finally {
            try {
                STALE_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
            } catch {
                // Ignore storage unavailability
            }
            setUser(null);
            router.push("/login");
            router.refresh();
        }
    }, [router]);

    const value = useMemo(
        () => ({
            user,
            login,
            register,
            logout,
            refreshUser: () => refreshUser(),
            isAuthenticated: !!user,
            loading,
        }),
        [user, login, register, logout, refreshUser, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
