export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRateLimit, handlePrismaError, requireAuth } from "@/lib/api/response";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const rateError = guardRateLimit(
            req,
            "exam-materials:download",
            { windowMs: 60 * 1000, maxRequests: 30 },
            auth.ctx.user.id
        );
        if (rateError) return rateError;

        const { id } = await params;
        await prisma.material.update({
            where: { id },
            data: { totalDownloads: { increment: 1 } },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return handlePrismaError(error, "exam-materials download GET");
    }
}
