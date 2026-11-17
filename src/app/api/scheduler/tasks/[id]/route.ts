export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { patchTaskSchema } from "@/lib/validation";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await params;

        const task = await prisma.task.findUnique({
            where: { id },
            select: { id: true, userId: true, groupId: true },
        });

        if (!task) {
            return jsonError("Task not found", 404);
        }

        if (task.userId !== auth.ctx.user.id) {
            return jsonError("Forbidden", 403);
        }

        if (task.groupId) {
            await prisma.task.deleteMany({
                where: {
                    userId: auth.ctx.user.id,
                    groupId: task.groupId,
                },
            });
        } else {
            await prisma.task.delete({ where: { id } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "scheduler/tasks DELETE");
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await params;

        const parsed = await parseJsonBody(req, patchTaskSchema);
        if (parsed.error) return parsed.error;

        const existing = await prisma.task.findUnique({
            where: { id },
            select: { id: true, userId: true },
        });

        if (!existing) {
            return jsonError("Task not found", 404);
        }

        if (existing.userId !== auth.ctx.user.id) {
            return jsonError("Forbidden", 403);
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                scheduledDay: parsed.data.scheduledDay,
                scheduledStartTime: parsed.data.scheduledStartTime,
            },
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        return handlePrismaError(error, "scheduler/tasks PATCH");
    }
}
