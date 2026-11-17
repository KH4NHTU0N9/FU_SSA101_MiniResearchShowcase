export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, requireAuth } from "@/lib/api/response";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await params;

        const card = await prisma.flashcard.findUnique({
            where: { id },
            select: { id: true, deck: { select: { userId: true } } },
        });

        if (!card) {
            return jsonError("Card not found", 404);
        }

        if (card.deck.userId !== auth.ctx.user.id) {
            return jsonError("Forbidden", 403);
        }

        await prisma.flashcard.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "flashcards/cards DELETE");
    }
}
