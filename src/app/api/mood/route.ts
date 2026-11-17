export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { createMoodSchema } from "@/lib/validation";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const logs = await prisma.moodLog.findMany({
            where: { userId: auth.ctx.user.id },
            orderBy: { createdAt: "desc" },
            take: 14,
        });

        return NextResponse.json(logs);
    } catch (error) {
        return handlePrismaError(error, "mood GET");
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, createMoodSchema);
        if (parsed.error) return parsed.error;

        const { mood, energy, emotion, focus, note } = parsed.data;

        const log = await prisma.moodLog.create({
            data: {
                userId: auth.ctx.user.id,
                mood,
                energy,
                emotion,
                focus,
                note,
            },
        });

        return NextResponse.json(log, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "mood POST");
    }
}
