import { z } from "zod";
import { boundedString } from "./common";

export const FLASHCARD_DECK_COLORS = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-pink-500",
] as const;

export const createDeckSchema = z.object({
    title: boundedString(1, 120, "Deck title"),
    description: z.string().trim().max(500).optional(),
    color: z.enum(FLASHCARD_DECK_COLORS),
});

export const createCardSchema = z.object({
    deckId: boundedString(1, 64, "Deck ID"),
    front: boundedString(1, 1000, "Front content"),
    back: boundedString(1, 2000, "Back content"),
});
