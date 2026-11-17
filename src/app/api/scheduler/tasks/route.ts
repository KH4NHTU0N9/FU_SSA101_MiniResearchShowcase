export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { createTaskSchema } from "@/lib/validation";

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, createTaskSchema);
        if (parsed.error) return parsed.error;

        const { name, duration, scheduledDay, scheduledStartTime, groupId } = parsed.data;

        const task = await prisma.task.create({
            data: {
                userId: auth.ctx.user.id,
                name,
                duration,
                scheduledDay: scheduledDay ?? null,
                scheduledStartTime: scheduledStartTime ?? null,
                groupId: groupId ?? null,
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "scheduler/tasks POST");
    }
}
