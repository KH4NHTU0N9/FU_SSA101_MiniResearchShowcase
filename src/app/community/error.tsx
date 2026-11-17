"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function CommunityError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Community Page Crash:", error);
    }, [error]);

    const isDev = process.env.NODE_ENV === "development";

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center bg-background p-4 text-center">
            <div className="bg-destructive/10 p-6 rounded-2xl max-w-md w-full border border-destructive/20 space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">Community Service Unavailable</h2>
                <p className="text-sm text-muted-foreground">
                    Unable to load community discussions right now. Please try again in a moment.
                </p>
                {error.digest && (
                    <p className="font-mono text-xs text-primary">Reference: {error.digest}</p>
                )}
                {isDev && error.message && (
                    <div className="text-xs font-mono text-muted-foreground bg-black/5 p-3 rounded-md text-left overflow-auto max-h-32">
                        {error.message}
                    </div>
                )}
                <Button type="button" onClick={reset} variant="outline" className="w-full">
                    Try Again
                </Button>
            </div>
        </div>
    );
}
