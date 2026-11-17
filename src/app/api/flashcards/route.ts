export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { createDeckSchema } from "@/lib/validation";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const decks = await prisma.flashcardDeck.findMany({
            where: { userId: auth.ctx.user.id },
            include: { cards: { orderBy: { createdAt: "asc" } } },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(decks);
    } catch (error) {
        return handlePrismaError(error, "flashcards GET");
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, createDeckSchema);
        if (parsed.error) return parsed.error;

        const deck = await prisma.flashcardDeck.create({
            data: {
                userId: auth.ctx.user.id,
                title: parsed.data.title,
                description: parsed.data.description || null,
                color: parsed.data.color,
            },
            include: { cards: true },
        });

        return NextResponse.json(deck, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "flashcards POST");
    }
}
