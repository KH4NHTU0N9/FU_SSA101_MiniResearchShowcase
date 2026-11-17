"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Root GlobalError]", error);
    }, [error]);

    return (
        <html lang="en">
            <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
                <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-rose-950/30 p-6 text-center space-y-4">
                    <h2 className="text-xl font-bold text-rose-400">Critical Application Error</h2>
                    <p className="text-sm text-slate-300">
                        We encountered an unexpected issue. Please reload or try again shortly.
                    </p>
                    {error.digest && (
                        <p className="font-mono text-xs text-slate-400">
                            Reference: {error.digest}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={reset}
                        className="px-4 py-2 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors"
                    >
                        Reload Application
                    </button>
                </div>
            </body>
        </html>
    );
}
