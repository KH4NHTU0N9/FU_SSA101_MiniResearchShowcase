import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
    put: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

import { GET } from "@/app/api/exam-materials/route";

describe("GET /api/exam-materials", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("requires authentication and applies semester, subject, and search filters", async () => {
        getSessionMock.mockResolvedValue(null);
        expect(
            (await GET(buildJsonRequest("http://localhost:3000/api/exam-materials", { method: "GET" })))
                .status
        ).toBe(401);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.material.findMany.mockResolvedValue([{ id: "mat_1", title: "MAE101 Exam" }]);
        prismaMock.material.count.mockResolvedValue(1);

        const res = await GET(
            buildJsonRequest(
                "http://localhost:3000/api/exam-materials?semesterId=sem1&subjectId=sub1&search=MAE101&page=2&limit=10",
                { method: "GET" }
            )
        );
        expect(res.status).toBe(200);
        expect(prismaMock.material.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: "APPROVED",
                    semesterId: "sem1",
                    subjectId: "sub1",
                }),
                skip: 10,
                take: 10,
            })
        );
        expect(await res.json()).toEqual({
            materials: [{ id: "mat_1", title: "MAE101 Exam" }],
            total: 1,
            page: 2,
            limit: 10,
        });
    });
});
