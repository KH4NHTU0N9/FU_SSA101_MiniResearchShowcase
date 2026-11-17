/**
 * Individual flashcard item within a deck.
 */
export interface FlashcardItem {
    id: string;
    front: string;
    back: string;
}

/**
 * Flashcard deck with nested cards.
 */
export interface FlashcardDeckDTO {
    id: string;
    title: string;
    description?: string;
    color: string;
    cards: FlashcardItem[];
}
