import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";
import type { AssessmentResultDTO, MoodHistoryEntry } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const dbUser = await prisma.user
        .findUnique({
            where: { id: session.user.id },
            select: { id: true, name: true, email: true, tokenVersion: true },
        })
        .catch(() => null);

    if (!dbUser || dbUser.tokenVersion !== session.user.tokenVersion) {
        redirect("/login");
    }

    let assessmentData: AssessmentResultDTO | null = null;
    let history: MoodHistoryEntry[] = [];

    try {
        const [assessment, moodLogs] = await Promise.all([
            prisma.assessment.findFirst({
                where: { userId: dbUser.id },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    depressionScore: true,
                    anxietyScore: true,
                    stressScore: true,
                    createdAt: true,
                },
            }),
            prisma.moodLog.findMany({
                where: { userId: dbUser.id },
                orderBy: { createdAt: "desc" },
                take: 14,
                select: {
                    id: true,
                    mood: true,
                    focus: true,
                    createdAt: true,
                    emotion: true,
                    energy: true,
                },
            }),
        ]);

        if (assessment) {
            assessmentData = {
                id: assessment.id,
                createdAt: assessment.createdAt.toISOString(),
                scores: {
                    Depression: assessment.depressionScore,
                    Anxiety: assessment.anxietyScore,
                    Stress: assessment.stressScore,
                },
            };
        }

        history = [...moodLogs].reverse().map((log) => ({
            id: log.id,
            mood: Number(log.mood),
            focus: Number(log.focus),
            energy: Number(log.energy),
            emotion: log.emotion,
            createdAt: log.createdAt.toISOString(),
            date: log.createdAt.toLocaleDateString("en-US", { weekday: "short" }),
        }));
    } catch (error) {
        console.error("[Dashboard SSR Error]", error);
    }

    return (
        <DashboardClient
            user={{
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
            }}
            initialHistory={history}
            assessmentData={assessmentData}
        />
    );
}
