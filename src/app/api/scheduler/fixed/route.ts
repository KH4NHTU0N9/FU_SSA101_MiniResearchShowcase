export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { createFixedEventSchema } from "@/lib/validation";

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, createFixedEventSchema);
        if (parsed.error) return parsed.error;

        const { name, day, startTime, endTime } = parsed.data;

        const event = await prisma.fixedEvent.create({
            data: {
                userId: auth.ctx.user.id,
                name,
                day,
                startTime,
                endTime,
            },
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "scheduler/fixed POST");
    }
}
