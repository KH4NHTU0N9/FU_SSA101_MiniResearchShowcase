"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExamMaterialsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[ExamMaterialsError]", error);
    }, [error]);

    const isDev = process.env.NODE_ENV === "development";

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h2 className="text-2xl font-bold text-red-500">Unable to load Exam Materials</h2>
            <p className="text-sm text-muted-foreground max-w-md">
                Something went wrong while fetching study resources. Please try again.
            </p>
            {error.digest && (
                <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
            )}
            {isDev && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-md text-left max-w-2xl overflow-auto border border-red-500/20 text-xs">
                    <p><strong>Message:</strong> {error.message}</p>
                </div>
            )}
            <Button type="button" onClick={reset}>
                Try again
            </Button>
        </div>
    );
}
