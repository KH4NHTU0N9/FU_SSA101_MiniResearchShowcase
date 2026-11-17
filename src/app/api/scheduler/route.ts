export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, requireAuth } from "@/lib/api/response";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const [fixedEvents, tasks] = await Promise.all([
            prisma.fixedEvent.findMany({
                where: { userId: auth.ctx.user.id },
                orderBy: { createdAt: "asc" },
            }),
            prisma.task.findMany({
                where: { userId: auth.ctx.user.id },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        return NextResponse.json({ fixedEvents, tasks });
    } catch (error) {
        return handlePrismaError(error, "scheduler GET");
    }
}

export async function DELETE(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        await prisma.$transaction([
            prisma.task.deleteMany({ where: { userId: auth.ctx.user.id } }),
            prisma.fixedEvent.deleteMany({ where: { userId: auth.ctx.user.id } }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "scheduler DELETE");
    }
}
