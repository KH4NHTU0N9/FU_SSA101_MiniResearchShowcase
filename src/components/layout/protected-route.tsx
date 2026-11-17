"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, loading, router]);

    if (loading) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="min-h-screen flex items-center justify-center"
            >
                <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
