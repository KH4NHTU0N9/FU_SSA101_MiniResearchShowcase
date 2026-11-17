"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/layout/protected-route";
import { FocusTimer } from "@/components/features/focus-timer";
import { Button } from "@/components/ui/button";

export default function FocusPage() {
    return (
        <ProtectedRoute>
            <div className="flex flex-col relative w-full flex-1">
                <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[150px] animate-pulse delay-1000" />
                </div>

                <header className="w-full flex justify-start p-4 z-50">
                    <Link href="/dashboard">
                        <Button
                            variant="ghost"
                            className="gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Exit Focus Mode
                        </Button>
                    </Link>
                </header>

                <section
                    aria-label="Focus timer"
                    className="flex-1 flex items-center justify-center p-4"
                >
                    <FocusTimer />
                </section>
            </div>
        </ProtectedRoute>
    );
}
