export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, requireAuth } from "@/lib/api/response";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const semesters = await prisma.semester.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                subjects: {
                    orderBy: { code: "asc" },
                    select: { id: true, code: true },
                },
            },
        });

        return NextResponse.json(semesters);
    } catch (error) {
        return handlePrismaError(error, "exam-materials/filters GET");
    }
}
