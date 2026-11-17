"use client";

import { useState } from "react";
import { ArrowLeft, Edit2, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FlashcardDeckDTO } from "@/types";

export interface DeckDetailProps {
    deck: FlashcardDeckDTO;
    onBack: () => void;
    onStudy: () => void;
    onAddCard: (front: string, back: string) => Promise<boolean>;
    onRemoveCard: (cardId: string) => void;
}

/**
 * Displays cards inside a selected flashcard deck alongside an inline form to append new cards.
 */
export function DeckDetail({
    deck,
    onBack,
    onStudy,
    onAddCard,
    onRemoveCard,
}: DeckDetailProps) {
    const [front, setFront] = useState("");
    const [back, setBack] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedFront = front.trim();
        const trimmedBack = back.trim();
        if (!trimmedFront || !trimmedBack || submitting) return;

        setSubmitting(true);
        const ok = await onAddCard(trimmedFront, trimmedBack);
        setSubmitting(false);

        if (ok) {
            setFront("");
            setBack("");
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        aria-label="Back to deck library"
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                            <span className={cn("w-4 h-4 rounded-full", deck.color)} />
                            {deck.title}
                        </h1>
                        <p className="text-muted-foreground">{deck.cards.length} cards</p>
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={onStudy}
                    disabled={deck.cards.length === 0}
                    className={cn(
                        "gap-2 rounded-full px-6 transition-all",
                        deck.cards.length > 0
                            ? "shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105"
                            : ""
                    )}
                >
                    <Play className="w-4 h-4 fill-current" aria-hidden="true" /> Study Deck
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Edit2 className="w-4 h-4" aria-hidden="true" /> Cards in Deck
                    </h3>

                    <div className="space-y-3">
                        {deck.cards.map((card) => (
                            <div
                                key={card.id}
                                className="flex gap-4 p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors group"
                            >
                                <div className="flex-1 space-y-1">
                                    <div className="font-medium">{card.front}</div>
                                    <div className="text-sm text-muted-foreground border-t pt-1 mt-1 border-border/50">
                                        {card.back}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Remove card ${card.front}`}
                                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8 self-center"
                                    onClick={() => onRemoveCard(card.id)}
                                >
                                    <X className="w-4 h-4" aria-hidden="true" />
                                </Button>
                            </div>
                        ))}
                        {deck.cards.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                                No cards yet. Add some alongside!
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <Card className="sticky top-24 border-none shadow-xl bg-gradient-to-br from-card to-secondary/10">
                        <CardContent className="p-6">
                            <form onSubmit={(e) => void handleAdd(e)} className="space-y-4">
                                <h3 className="font-semibold text-lg">Add New Card</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="card-front-input">Front (Term/Question)</Label>
                                    <Input
                                        id="card-front-input"
                                        value={front}
                                        onChange={(e) => setFront(e.target.value)}
                                        placeholder="e.g. Serendipity"
                                        maxLength={500}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="card-back-input">Back (Definition/Answer)</Label>
                                    <Textarea
                                        id="card-back-input"
                                        value={back}
                                        onChange={(e) => setBack(e.target.value)}
                                        placeholder="e.g. The occurrence of events by chance in a happy or beneficial way"
                                        className="min-h-[100px] resize-none"
                                        maxLength={2000}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full gap-2"
                                    disabled={!front.trim() || !back.trim() || submitting}
                                >
                                    <Plus className="w-4 h-4" aria-hidden="true" />{" "}
                                    {submitting ? "Adding..." : "Add Card"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
