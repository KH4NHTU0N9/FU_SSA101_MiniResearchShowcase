export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { batchCreateTasksSchema } from "@/lib/validation";

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, batchCreateTasksSchema);
        if (parsed.error) return parsed.error;

        const userId = auth.ctx.user.id;
        const { tasks } = parsed.data;

        const createdTasks = await prisma.$transaction(
            tasks.map((t) =>
                prisma.task.create({
                    data: {
                        userId,
                        name: t.name,
                        duration: t.duration,
                        scheduledDay: t.scheduledDay ?? null,
                        scheduledStartTime: t.scheduledStartTime ?? null,
                        groupId: t.groupId ?? null,
                    },
                })
            )
        );

        return NextResponse.json(createdTasks, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "scheduler/tasks/batch-create POST");
    }
}
