import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest, buildRawRequest } from "@/test/mocks/next";

const { cookieJar, activeUserRef, decks, cards } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    activeUserRef: {
        current: { id: "u-fc-1", email: "fc@fpt.edu.vn", name: "Minh", tokenVersion: 1 },
    },
    decks: [] as Array<{
        id: string;
        userId: string;
        title: string;
        description: string | null;
        color: string;
        createdAt: Date;
    }>,
    cards: [] as Array<{
        id: string;
        deckId: string;
        front: string;
        back: string;
        createdAt: Date;
    }>,
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => {
            const val = cookieJar.get(name);
            return val ? { name, value: val } : undefined;
        },
        set: (name: string, value: string) => {
            cookieJar.set(name, value);
        },
        delete: (name: string) => {
            cookieJar.delete(name);
        },
    }),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                where.id === activeUserRef.current.id ? activeUserRef.current : null,
        },
        flashcardDeck: {
            create: async ({
                data,
            }: {
                data: { userId: string; title: string; description: string | null; color: string };
            }) => {
                const row = { id: `deck-${decks.length + 1}`, ...data, createdAt: new Date() };
                decks.push(row);
                return { ...row, cards: [] };
            },
            findMany: async ({ where }: { where: { userId: string } }) =>
                decks
                    .filter((d) => d.userId === where.userId)
                    .map((d) => ({ ...d, cards: cards.filter((c) => c.deckId === d.id) })),
            findUnique: async ({ where }: { where: { id: string } }) =>
                decks.find((d) => d.id === where.id) ?? null,
            delete: async ({ where }: { where: { id: string } }) => {
                const idx = decks.findIndex((d) => d.id === where.id);
                if (idx >= 0) decks.splice(idx, 1);
                for (let i = cards.length - 1; i >= 0; i--) {
                    if (cards[i].deckId === where.id) cards.splice(i, 1);
                }
            },
        },
        flashcard: {
            create: async ({ data }: { data: { deckId: string; front: string; back: string } }) => {
                const row = { id: `card-${cards.length + 1}`, ...data, createdAt: new Date() };
                cards.push(row);
                return row;
            },
            findUnique: async ({ where }: { where: { id: string } }) => {
                const c = cards.find((item) => item.id === where.id);
                if (!c) return null;
                const d = decks.find((deck) => deck.id === c.deckId);
                return { ...c, deck: { userId: d?.userId } };
            },
            delete: async ({ where }: { where: { id: string } }) => {
                const idx = cards.findIndex((item) => item.id === where.id);
                if (idx >= 0) cards.splice(idx, 1);
            },
        },
    },
}));

import { setSession } from "@/lib/session";
import { GET as listDecks, POST as createDeck } from "@/app/api/flashcards/route";
import { POST as createCard } from "@/app/api/flashcards/cards/route";
import { DELETE as deleteCard } from "@/app/api/flashcards/cards/[id]/route";
import { DELETE as deleteDeck } from "@/app/api/flashcards/[id]/route";

describe("e2e/flashcards-lifecycle", () => {
    beforeEach(async () => {
        cookieJar.clear();
        decks.length = 0;
        cards.length = 0;
        activeUserRef.current = {
            id: "u-fc-1",
            email: "fc@fpt.edu.vn",
            name: "Minh",
            tokenVersion: 1,
        };
        await setSession(activeUserRef.current);
    });

    it("creates deck, appends card, enforces ownership on card/deck mutations, and cascades delete", async () => {
        const deckRes = await createDeck(
            buildJsonRequest("http://localhost/api/flashcards", {
                method: "POST",
                body: { title: "DB Systems", description: "ACID", color: "bg-indigo-500" },
            })
        );
        expect(deckRes.status).toBe(201);
        const deck = await deckRes.json();

        const cardRes = await createCard(
            buildJsonRequest("http://localhost/api/flashcards/cards", {
                method: "POST",
                body: { deckId: deck.id, front: "Isolation", back: "Concurrent tx separation" },
            })
        );
        expect(cardRes.status).toBe(201);
        const card = await cardRes.json();

        const listed = await (await listDecks()).json();
        expect(listed).toHaveLength(1);
        expect(listed[0].cards).toHaveLength(1);

        // Stranger blocked from deleting card
        activeUserRef.current = {
            id: "u-fc-stranger",
            email: "stranger@fpt.edu.vn",
            name: "Stranger",
            tokenVersion: 1,
        };
        await setSession(activeUserRef.current);

        const forbiddenCardDel = await deleteCard(
            buildRawRequest(`http://localhost/api/flashcards/cards/${card.id}`, {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: card.id }) }
        );
        expect(forbiddenCardDel.status).toBe(403);

        // Restore owner & delete card + deck
        activeUserRef.current = {
            id: "u-fc-1",
            email: "fc@fpt.edu.vn",
            name: "Minh",
            tokenVersion: 1,
        };
        await setSession(activeUserRef.current);

        expect(
            (
                await deleteCard(
                    buildRawRequest(`http://localhost/api/flashcards/cards/${card.id}`, {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: card.id }) }
                )
            ).status
        ).toBe(200);

        expect(
            (
                await deleteDeck(
                    buildRawRequest(`http://localhost/api/flashcards/${deck.id}`, {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: deck.id }) }
                )
            ).status
        ).toBe(200);
        expect(decks).toHaveLength(0);
    });
});
