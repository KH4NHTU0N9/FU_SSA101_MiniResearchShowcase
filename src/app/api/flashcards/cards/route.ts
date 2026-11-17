export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { createCardSchema } from "@/lib/validation";

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, createCardSchema);
        if (parsed.error) return parsed.error;

        const { deckId, front, back } = parsed.data;

        const deck = await prisma.flashcardDeck.findUnique({
            where: { id: deckId },
            select: { id: true, userId: true },
        });

        if (!deck) {
            return jsonError("Deck not found", 404);
        }

        if (deck.userId !== auth.ctx.user.id) {
            return jsonError("Forbidden", 403);
        }

        const card = await prisma.flashcard.create({
            data: { deckId, front, back },
        });

        return NextResponse.json(card, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "flashcards/cards POST");
    }
}
