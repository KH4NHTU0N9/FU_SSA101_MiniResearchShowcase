export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { batchUpdateTasksSchema } from "@/lib/validation";

export async function PUT(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, batchUpdateTasksSchema);
        if (parsed.error) return parsed.error;

        const userId = auth.ctx.user.id;
        const { updates } = parsed.data;
        const uniqueIds = Array.from(new Set(updates.map((u) => u.id)));

        const ownedCount = await prisma.task.count({
            where: {
                id: { in: uniqueIds },
                userId,
            },
        });

        if (ownedCount !== uniqueIds.length) {
            return jsonError("One or more tasks were not found or do not belong to you.", 404);
        }

        await prisma.$transaction(
            updates.map((u) =>
                prisma.task.update({
                    where: { id: u.id },
                    data: {
                        scheduledDay: u.assignedSlot?.day ?? null,
                        scheduledStartTime: u.assignedSlot?.startTime ?? null,
                    },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "scheduler/tasks/batch PUT");
    }
}
