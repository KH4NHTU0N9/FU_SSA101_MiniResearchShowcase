import { redirect } from "next/navigation";
import { FlashcardSystem } from "@/components/features/flashcard-system";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { FlashcardDeckDTO } from "@/types";

export async function FlashcardListServer() {
    const session = await getSession();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const dbUser = await prisma.user
        .findUnique({
            where: { id: session.user.id },
            select: { id: true, tokenVersion: true },
        })
        .catch(() => null);

    if (!dbUser || dbUser.tokenVersion !== session.user.tokenVersion) {
        redirect("/login");
    }

    const rawDecks = await prisma.flashcardDeck.findMany({
        where: { userId: dbUser.id },
        select: {
            id: true,
            title: true,
            description: true,
            color: true,
            cards: {
                select: {
                    id: true,
                    front: true,
                    back: true,
                },
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const decks: FlashcardDeckDTO[] = rawDecks.map((deck) => ({
        id: deck.id,
        title: deck.title,
        description: deck.description || undefined,
        color: deck.color,
        cards: deck.cards,
    }));

    return <FlashcardSystem initialDecks={decks} />;
}
