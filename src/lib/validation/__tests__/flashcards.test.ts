import { describe, expect, it } from "vitest";
import {
    FLASHCARD_DECK_COLORS,
    createCardSchema,
    createDeckSchema,
} from "@/lib/validation/flashcards";

describe("validation/flashcards", () => {
    it("accepts all supported Tailwind deck colors and trimmed metadata", () => {
        for (const color of FLASHCARD_DECK_COLORS) {
            const parsed = createDeckSchema.parse({
                title: "  Algorithm Terms  ",
                description: " Big O review ",
                color,
            });
            expect(parsed.title).toBe("Algorithm Terms");
            expect(parsed.description).toBe("Big O review");
        }
    });

    it("rejects arbitrary colors and empty flashcard faces", () => {
        expect(
            createDeckSchema.safeParse({
                title: "Valid",
                color: "bg-evil-custom",
            }).success
        ).toBe(false);

        expect(
            createCardSchema.safeParse({
                deckId: "deck_1",
                front: "  ",
                back: "Definition",
            }).success
        ).toBe(false);
    });
});
