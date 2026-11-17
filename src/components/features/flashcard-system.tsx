"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Edit2, Play, Plus, RotateCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { FlashcardDeckDTO, FlashcardItem } from "@/types";

const COLORS = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-pink-500",
] as const;

export function FlashcardSystem({
    initialDecks = [],
}: {
    initialDecks?: FlashcardDeckDTO[];
}) {
    const { showToast, confirmAction } = useToast();
    const [decks, setDecks] = useState<FlashcardDeckDTO[]>(initialDecks);
    const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
    const [isStudyMode, setIsStudyMode] = useState(false);

    const activeDeck = decks.find((d) => d.id === activeDeckId);

    const createDeck = async (
        title: string,
        desc: string,
        color: string
    ): Promise<boolean> => {
        try {
            const res = await fetch("/api/flashcards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description: desc, color }),
            });

            if (!res.ok) {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to create deck.", "error");
                return false;
            }

            const newDeck = (await res.json()) as FlashcardDeckDTO;
            setDecks((prev) => [{ ...newDeck, cards: newDeck.cards ?? [] }, ...prev]);
            showToast("Deck created.", "success");
            return true;
        } catch {
            showToast("Network error while creating deck.", "error");
            return false;
        }
    };

    const deleteDeck = async (id: string) => {
        const confirmed = await confirmAction({
            title: "Delete flashcard deck?",
            description: "All cards inside this deck will be permanently removed.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            destructive: true,
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/flashcards/${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to delete deck.", "error");
                return;
            }
            setDecks((prev) => prev.filter((d) => d.id !== id));
            if (activeDeckId === id) {
                setActiveDeckId(null);
                setIsStudyMode(false);
            }
            showToast("Deck deleted.", "info");
        } catch {
            showToast("Network error while deleting deck.", "error");
        }
    };

    const addCard = async (
        deckId: string,
        front: string,
        back: string
    ): Promise<boolean> => {
        try {
            const res = await fetch("/api/flashcards/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deckId, front, back }),
            });

            if (!res.ok) {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to add card.", "error");
                return false;
            }

            const newCard = (await res.json()) as FlashcardItem;
            setDecks((prev) =>
                prev.map((d) =>
                    d.id === deckId ? { ...d, cards: [...d.cards, newCard] } : d
                )
            );
            return true;
        } catch {
            showToast("Network error while adding card.", "error");
            return false;
        }
    };

    const removeCard = async (deckId: string, cardId: string) => {
        try {
            const res = await fetch(`/api/flashcards/cards/${encodeURIComponent(cardId)}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to remove card.", "error");
                return;
            }
            setDecks((prev) =>
                prev.map((d) =>
                    d.id === deckId
                        ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) }
                        : d
                )
            );
        } catch {
            showToast("Network error while removing card.", "error");
        }
    };

    if (isStudyMode && activeDeck) {
        return <StudyMode deck={activeDeck} onExit={() => setIsStudyMode(false)} />;
    }

    if (activeDeck) {
        return (
            <DeckDetail
                deck={activeDeck}
                onBack={() => setActiveDeckId(null)}
                onStudy={() => setIsStudyMode(true)}
                onAddCard={(f, b) => addCard(activeDeck.id, f, b)}
                onRemoveCard={(cid) => void removeCard(activeDeck.id, cid)}
            />
        );
    }

    return (
        <DeckList
            decks={decks}
            onCreate={createDeck}
            onDelete={(id) => void deleteDeck(id)}
            onSelect={setActiveDeckId}
        />
    );
}

function DeckList({
    decks,
    onCreate,
    onDelete,
    onSelect,
}: {
    decks: FlashcardDeckDTO[];
    onCreate: (t: string, d: string, c: string) => Promise<boolean>;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newColor, setNewColor] = useState<string>(COLORS[0]);
    const [creating, setCreating] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle || creating) return;

        setCreating(true);
        const ok = await onCreate(trimmedTitle, newDesc.trim(), newColor);
        setCreating(false);

        if (ok) {
            setIsOpen(false);
            setNewTitle("");
            setNewDesc("");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Your Library</h2>
                    <p className="text-muted-foreground">Manage your flashcard decks</p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 rounded-full shadow-lg hover:shadow-xl transition-all">
                            <Plus className="w-4 h-4" aria-hidden="true" /> Create Deck
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Deck</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="deck-title-input">Title</Label>
                                <Input
                                    id="deck-title-input"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Spanish Basics"
                                    maxLength={100}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deck-desc-input">Description (Optional)</Label>
                                <Input
                                    id="deck-desc-input"
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="e.g. Chapter 1 vocabulary"
                                    maxLength={300}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            aria-label={`Select deck color ${c.replace("bg-", "").replace("-500", "")}`}
                                            aria-pressed={newColor === c}
                                            className={cn(
                                                "w-8 h-8 rounded-full transition-all ring-2 ring-offset-2 ring-offset-background",
                                                c,
                                                newColor === c
                                                    ? "ring-primary scale-110"
                                                    : "ring-transparent hover:scale-105"
                                            )}
                                            onClick={() => setNewColor(c)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!newTitle.trim() || creating}
                            >
                                {creating ? "Creating..." : "Create Deck"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {decks.map((deck) => (
                    <div
                        key={deck.id}
                        className="group relative bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                    >
                        <div className={cn("h-3 w-full", deck.color)} />
                        <button
                            type="button"
                            onClick={() => onSelect(deck.id)}
                            className="p-6 pb-3 text-left flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <h3 className="font-bold text-xl truncate">{deck.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em] mt-2">
                                {deck.description || "No description"}
                            </p>
                        </button>

                        <div className="flex items-center justify-between px-6 pb-5 pt-1">
                            <span className="inline-flex items-center text-sm font-medium text-muted-foreground bg-secondary/50 px-2.5 py-0.5 rounded-full">
                                {deck.cards.length} cards
                            </span>

                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Delete ${deck.title}`}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                onClick={() => onDelete(deck.id)}
                            >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {decks.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
                        <RotateCw className="h-10 w-10 opacity-20" aria-hidden="true" />
                    </div>
                    <p>No decks found. Create one to get started!</p>
                </div>
            )}
        </div>
    );
}

function DeckDetail({
    deck,
    onBack,
    onStudy,
    onAddCard,
    onRemoveCard,
}: {
    deck: FlashcardDeckDTO;
    onBack: () => void;
    onStudy: () => void;
    onAddCard: (f: string, b: string) => Promise<boolean>;
    onRemoveCard: (id: string) => void;
}) {
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

function StudyMode({ deck, onExit }: { deck: FlashcardDeckDTO; onExit: () => void }) {
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
