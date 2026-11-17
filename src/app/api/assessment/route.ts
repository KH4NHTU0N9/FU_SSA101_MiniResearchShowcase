export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, parseJsonBody, requireAuth } from "@/lib/api/response";
import { createAssessmentSchema } from "@/lib/validation";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const latest = await prisma.assessment.findFirst({
            where: { userId: auth.ctx.user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(latest);
    } catch (error) {
        return handlePrismaError(error, "assessment GET");
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const parsed = await parseJsonBody(req, createAssessmentSchema);
        if (parsed.error) return parsed.error;

        const { Depression, Anxiety, Stress } = parsed.data.scores;

        const assessment = await prisma.assessment.create({
            data: {
                userId: auth.ctx.user.id,
                depressionScore: Depression,
                anxietyScore: Anxiety,
                stressScore: Stress,
            },
        });

        return NextResponse.json(assessment, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "assessment POST");
    }
}
