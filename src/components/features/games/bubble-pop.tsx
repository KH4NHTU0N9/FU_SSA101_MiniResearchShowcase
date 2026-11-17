"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GRID_SIZE = 5;
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;

export function BubblePopGame() {
    const [bubbles, setBubbles] = useState<boolean[]>(() =>
        Array(TOTAL_BUBBLES).fill(false)
    );
    const [score, setScore] = useState(0);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
            }
        };
    }, []);

    const playPopSound = useCallback(() => {
        if (typeof Audio === "undefined") return;
        if (!audioRef.current) {
            audioRef.current = new Audio(
                "https://actions.google.com/sounds/v1/cartoon/pop.ogg"
            );
            audioRef.current.volume = 0.5;
        }
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    }, []);

    const resetGame = useCallback(() => {
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        setBubbles(Array(TOTAL_BUBBLES).fill(false));
    }, []);

    const handlePop = (index: number) => {
        if (bubbles[index]) return;

        const nextBubbles = [...bubbles];
        nextBubbles[index] = true;
        setBubbles(nextBubbles);
        setScore((s) => s + 1);
        playPopSound();

        if (nextBubbles.every(Boolean)) {
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
                resetTimerRef.current = null;
                setBubbles(Array(TOTAL_BUBBLES).fill(false));
            }, 1000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-8 p-4">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Trophy className="text-yellow-500 w-6 h-6" aria-hidden="true" /> Score:{" "}
                    {score}
                </h3>
                <p className="text-muted-foreground text-sm">Pop all the bubbles to reset!</p>
            </div>

            <div
                className="grid gap-3 sm:gap-4 p-4 sm:p-6 bg-secondary/30 rounded-3xl backdrop-blur-sm shadow-xl"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
            >
                {bubbles.map((isPopped, index) => (
                    <Bubble
                        key={index}
                        index={index}
                        isPopped={isPopped}
                        onClick={() => handlePop(index)}
                    />
                ))}
            </div>

            <Button type="button" variant="outline" onClick={resetGame} className="gap-2">
                <RefreshCw className="w-4 h-4" aria-hidden="true" /> Reset Board
            </Button>
        </div>
    );
}

function Bubble({
    index,
    isPopped,
    onClick,
}: {
    index: number;
    isPopped: boolean;
    onClick: () => void;
}) {
    return (
        <motion.button
            type="button"
            disabled={isPopped}
            aria-label={isPopped ? `Bubble ${index + 1} popped` : `Pop bubble ${index + 1}`}
            whileHover={isPopped ? undefined : { scale: 1.05 }}
            whileTap={isPopped ? undefined : { scale: 0.9 }}
            onClick={onClick}
            className={cn(
                "w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full shadow-lg transition-colors relative overflow-hidden",
                isPopped
                    ? "bg-secondary/50 shadow-inner cursor-default"
                    : "bg-gradient-to-br from-cyan-400 to-blue-500 cursor-pointer hover:shadow-cyan-500/50"
            )}
        >
            {!isPopped && (
                <div className="absolute top-1 left-2 w-4 h-2 bg-white/40 rounded-full rotate-[-45deg] blur-[1px]" />
            )}

            <AnimatePresence>
                {isPopped && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-white rounded-full"
                    />
                )}
            </AnimatePresence>
        </motion.button>
    );
}
