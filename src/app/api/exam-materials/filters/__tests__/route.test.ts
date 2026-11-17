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

import { GET } from "@/app/api/exam-materials/filters/route";

describe("GET /api/exam-materials/filters", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("requires authentication and returns sorted semesters with nested subjects", async () => {
        getSessionMock.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        const mockSemesters = [
            { id: "s1", name: "Spring 2026", subjects: [{ id: "sub1", code: "MAE101" }] },
        ];
        prismaMock.semester.findMany.mockResolvedValue(mockSemesters);

        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(mockSemesters);
    });
});
