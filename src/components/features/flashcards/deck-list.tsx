"use client";

import { useState } from "react";
import { Plus, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FlashcardDeckDTO } from "@/types";

export const DECK_COLORS = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-pink-500",
] as const;

export interface DeckListProps {
    decks: FlashcardDeckDTO[];
    onCreate: (title: string, description: string, color: string) => Promise<boolean>;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

/**
 * Displays the user's flashcard deck library along with a modal dialog to create new decks.
 */
export function DeckList({ decks, onCreate, onDelete, onSelect }: DeckListProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newColor, setNewColor] = useState<string>(DECK_COLORS[0]);
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
                    <DialogContent aria-describedby={undefined}>
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
                                    {DECK_COLORS.map((c) => (
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
