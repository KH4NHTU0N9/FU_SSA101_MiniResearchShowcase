import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlashcardSkeleton } from "@/components/features/flashcards/flashcard-skeleton";

describe("features/flashcards/FlashcardSkeleton", () => {
    it("renders three loading deck skeleton cards", () => {
        const { container } = render(<FlashcardSkeleton />);
        const skeletons = container.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBeGreaterThanOrEqual(12);
    });
});
