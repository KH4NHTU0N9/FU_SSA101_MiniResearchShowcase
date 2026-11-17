"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FlashcardDeckDTO } from "@/types";

export interface StudyModeProps {
    deck: FlashcardDeckDTO;
    onExit: () => void;
}

/**
 * Full-screen interactive flashcard player supporting keyboard navigation (Space, ArrowLeft/Right, Escape).
 */
export function StudyMode({ deck, onExit }: StudyModeProps) {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const total = deck.cards.length;

    const scheduleIndexChange = useCallback(
        (delta: number) => {
            if (total <= 0) return;
            setIsFlipped(false);
            if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
            flipTimerRef.current = setTimeout(() => {
                setIndex((prev) => (prev + delta + total) % total);
            }, 250);
        },
        [total]
    );

    const handleNext = useCallback(() => scheduleIndexChange(1), [scheduleIndexChange]);
    const handlePrev = useCallback(() => scheduleIndexChange(-1), [scheduleIndexChange]);

    useEffect(() => {
        return () => {
            if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName;
            const isInteractive = tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA";
            if (!isInteractive && (e.key === " " || e.key === "Enter")) {
                e.preventDefault();
                setIsFlipped((p) => !p);
            } else if (e.key === "ArrowRight") {
                handleNext();
            } else if (e.key === "ArrowLeft") {
                handlePrev();
            } else if (e.key === "Escape") {
                onExit();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [handleNext, handlePrev, onExit]);

    const currentCard = deck.cards[index] ?? deck.cards[0];

    if (!currentCard) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 gap-4">
                <p className="text-muted-foreground">This deck has no flashcards to study.</p>
                <Button onClick={onExit}>Back to Deck</Button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
            <div className="h-16 border-b flex items-center justify-between px-6">
                <Button type="button" variant="ghost" onClick={onExit} className="gap-2">
                    <X className="w-4 h-4" aria-hidden="true" /> Exit
                </Button>
                <div className="flex flex-col items-center">
                    <span className="font-bold">{deck.title}</span>
                    <span className="text-xs text-muted-foreground">
                        {Math.min(index, total - 1) + 1} / {total}
                    </span>
                </div>
                <div className="w-20" />
            </div>

            <div className="flex-1 flex items-center justify-center p-6 bg-secondary/10 relative overflow-hidden">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px] animate-pulse pointer-events-none" />

                <button
                    type="button"
                    aria-label={isFlipped ? "Show term front" : "Show definition back"}
                    aria-pressed={isFlipped}
                    className="w-full max-w-2xl aspect-[3/2] perspective-[1000px] cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-3xl"
                    onClick={() => setIsFlipped((prev) => !prev)}
                >
                    <motion.div
                        initial={false}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full h-full relative preserve-3d"
                        style={{ transformStyle: "preserve-3d" }}
                    >
                        <div
                            className={cn(
                                "absolute inset-0 backface-hidden rounded-3xl shadow-2xl flex flex-col items-center justify-center p-12 text-center border-2 border-primary/10 bg-card",
                                "hover:border-primary/30 transition-colors"
                            )}
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground absolute top-8">
                                Term
                            </span>
                            <h2 className="text-3xl md:text-5xl font-bold">{currentCard.front}</h2>
                            <span className="text-xs text-muted-foreground absolute bottom-8">
                                Click or Space to flip
                            </span>
                        </div>

                        <div
                            className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl flex flex-col items-center justify-center p-12 text-center border-2 border-secondary bg-primary/5 text-foreground"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        >
                            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground absolute top-8">
                                Definition
                            </span>
                            <p className="text-xl md:text-3xl font-medium leading-relaxed">
                                {currentCard.back}
                            </p>
                        </div>
                    </motion.div>
                </button>
            </div>

            <div className="h-24 border-t bg-card flex items-center justify-center gap-8">
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full"
                    onClick={handlePrev}
                    aria-label="Previous card"
                >
                    <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                </Button>

                <Button
                    type="button"
                    size="lg"
                    className="rounded-full px-12 text-lg h-12"
                    onClick={() => setIsFlipped((prev) => !prev)}
                >
                    <RotateCw className="w-5 h-5 mr-2" aria-hidden="true" /> Flip
                </Button>

                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full"
                    onClick={handleNext}
                    aria-label="Next card"
                >
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
