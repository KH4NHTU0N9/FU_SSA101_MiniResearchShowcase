"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalAppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[App Error Boundary]", error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">
                    An unexpected error occurred while loading this page. Please try again.
                </p>
                {error.digest && (
                    <p className="font-mono text-xs text-muted-foreground">
                        Reference: {error.digest}
                    </p>
                )}
                <div className="flex gap-3 justify-center">
                    <Button type="button" onClick={reset}>
                        Try Again
                    </Button>
                    <Link href="/">
                        <Button type="button" variant="outline">
                            Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
