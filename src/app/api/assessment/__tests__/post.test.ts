import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

import { POST } from "@/app/api/assessment/route";

function buildAssessmentReq(body: unknown, origin = "http://localhost:3000"): NextRequest {
    return new NextRequest("http://localhost:3000/api/assessment", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Host: "localhost:3000",
            Origin: origin,
        },
        body: JSON.stringify(body),
    });
}

describe("POST /api/assessment", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("blocks cross-origin CSRF POSTs with 403 and out-of-range raw scores with 400", async () => {
        expect(
            (
                await POST(
                    buildAssessmentReq(
                        { scores: { Depression: 5, Anxiety: 4, Stress: 8 } },
                        "https://evil.example"
                    )
                )
            ).status
        ).toBe(403);

        const user = createMockUser({ id: "user_1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "user_1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildAssessmentReq({
                        scores: { Depression: 22, Anxiety: 4, Stress: 8 },
                    })
                )
            ).status
        ).toBe(400);
    });

    it("persists valid DASS-21 raw subscale scores and returns 201", async () => {
        const user = createMockUser({ id: "user_1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "user_1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.assessment.create.mockResolvedValue({
            id: "assess_new",
            userId: "user_1",
            depressionScore: 10,
            anxietyScore: 7,
            stressScore: 14,
        });

        const res = await POST(
            buildAssessmentReq({
                scores: { Depression: 10, Anxiety: 7, Stress: 14 },
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.assessment.create).toHaveBeenCalledWith({
            data: {
                userId: "user_1",
                depressionScore: 10,
                anxietyScore: 7,
                stressScore: 14,
            },
        });
    });
});
