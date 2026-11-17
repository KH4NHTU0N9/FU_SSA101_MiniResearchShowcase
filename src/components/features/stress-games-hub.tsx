"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Circle, Loader2, Music, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const ColorByNumberGame = dynamic(
    () => import("./games/color-by-number").then((mod) => mod.ColorByNumberGame),
    {
        loading: () => (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        ),
        ssr: false,
    }
);

const AmbientGame = dynamic(
    () => import("./games/ambient-game").then((mod) => mod.AmbientGame),
    {
        loading: () => (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        ),
        ssr: false,
    }
);

const BubblePopGame = dynamic(
    () => import("./games/bubble-pop").then((mod) => mod.BubblePopGame),
    {
        loading: () => (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        ),
        ssr: false,
    }
);

export function StressGamesHub() {
    const [activeGame, setActiveGame] = useState<"bubble" | "color" | "ambient">("bubble");

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-center flex-wrap gap-4">
                <div
                    role="tablist"
                    aria-label="Stress relief games"
                    className="bg-secondary/50 p-1 rounded-full flex gap-1 overflow-x-auto max-w-[90vw]"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeGame === "bubble"}
                        onClick={() => setActiveGame("bubble")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                            activeGame === "bubble"
                                ? "bg-background shadow-md text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Circle className="w-4 h-4" aria-hidden="true" /> Bubble Pop
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeGame === "color"}
                        onClick={() => setActiveGame("color")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                            activeGame === "color"
                                ? "bg-background shadow-md text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Palette className="w-4 h-4" aria-hidden="true" /> Color By Number
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeGame === "ambient"}
                        onClick={() => setActiveGame("ambient")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                            activeGame === "ambient"
                                ? "bg-background shadow-md text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Music className="w-4 h-4" aria-hidden="true" /> Ambient
                    </button>
                </div>
            </div>

            <div className="min-h-[600px] flex items-center justify-center bg-card/50 border rounded-3xl shadow-sm relative overflow-hidden p-4 md:p-8">
                <div
                    className={cn(
                        "absolute inset-0 opacity-10 blur-[100px] transition-colors duration-1000",
                        activeGame === "bubble"
                            ? "bg-cyan-500/20"
                            : activeGame === "color"
                              ? "bg-violet-500/20"
                              : "bg-purple-500/20"
                    )}
                />

                <div className="relative z-10 w-full h-full max-w-4xl">
                    {activeGame === "bubble" && <BubblePopGame />}
                    {activeGame === "color" && <ColorByNumberGame />}
                    {activeGame === "ambient" && <AmbientGame />}
                </div>
            </div>
        </div>
    );
}
