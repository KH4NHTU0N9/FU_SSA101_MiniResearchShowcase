"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { DeckDetail } from "@/components/features/flashcards/deck-detail";
import { DeckList } from "@/components/features/flashcards/deck-list";
import { StudyMode } from "@/components/features/flashcards/study-mode";
import type { FlashcardDeckDTO, FlashcardItem } from "@/types";

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
