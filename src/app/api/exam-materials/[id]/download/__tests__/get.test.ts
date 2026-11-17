import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
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

import { GET } from "@/app/api/exam-materials/[id]/download/route";
import { resetRateLimitStore } from "@/lib/security";

describe("GET /api/exam-materials/[id]/download", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
    });

    it("increments download counter atomically and maps P2025 missing row to 404", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.material.update.mockResolvedValueOnce({ id: "m1" });

        const okRes = await GET(
            buildJsonRequest("http://localhost:3000/api/exam-materials/m1/download", {
                method: "GET",
            }),
            { params: Promise.resolve({ id: "m1" }) }
        );
        expect(okRes.status).toBe(200);
        expect(await okRes.json()).toEqual({ ok: true });

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.material.update.mockRejectedValueOnce(
            new Prisma.PrismaClientKnownRequestError("Missing", {
                code: "P2025",
                clientVersion: "6.19.2",
            })
        );
        const missingRes = await GET(
            buildJsonRequest("http://localhost:3000/api/exam-materials/missing/download", {
                method: "GET",
            }),
            { params: Promise.resolve({ id: "missing" }) }
        );
        expect(missingRes.status).toBe(404);
    });

    it("rate limits download counter inflation beyond 30 requests/minute", async () => {
        const user = createMockUser({ id: "u_dl_spam" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_dl_spam" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.material.update.mockResolvedValue({ id: "m1" });

        for (let i = 0; i < 30; i++) {
            await GET(
                buildJsonRequest("http://localhost:3000/api/exam-materials/m1/download", {
                    method: "GET",
                }),
                { params: Promise.resolve({ id: "m1" }) }
            );
        }

        const limited = await GET(
            buildJsonRequest("http://localhost:3000/api/exam-materials/m1/download", {
                method: "GET",
            }),
            { params: Promise.resolve({ id: "m1" }) }
        );
        expect(limited.status).toBe(429);
    });
});
