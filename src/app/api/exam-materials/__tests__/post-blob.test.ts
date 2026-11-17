import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildRawRequest } from "@/test/mocks/next";
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

import { POST } from "@/app/api/exam-materials/route";
import { resetRateLimitStore } from "@/lib/security";

function buildMaterialForm(fields: Record<string, string>): Request {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
        form.set(k, v);
    }
    return buildRawRequest("http://localhost:3000/api/exam-materials", {
        rawBody: form,
    });
}

describe("POST /api/exam-materials — Vercel Blob metadata persistence", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
    });

    it("rejects mismatched subject/semester pairs and untrusted external file URLs", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.subject.findFirst.mockResolvedValueOnce(null);

        const mismatchRes = await POST(
            buildMaterialForm({
                title: "Notes",
                semesterId: "sem1",
                subjectId: "wrong_sub",
                uploadedFiles: JSON.stringify([
                    {
                        url: "https://store1.public.blob.vercel-storage.com/a.pdf",
                        name: "a.pdf",
                        size: 500,
                    },
                ]),
            })
        );
        expect(mismatchRes.status).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.subject.findFirst.mockResolvedValueOnce({ id: "sub1" });
        const ssrfRes = await POST(
            buildMaterialForm({
                title: "Evil",
                semesterId: "sem1",
                subjectId: "sub1",
                uploadedFiles: JSON.stringify([
                    {
                        url: "http://169.254.169.254/latest/meta-data",
                        name: "a.pdf",
                        size: 500,
                    },
                ]),
            })
        );
        expect(ssrfRes.status).toBe(400);
    });

    it("creates Material and child MaterialFile records atomically on valid Blob uploads", async () => {
        const user = createMockUser({ id: "u_uploader" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_uploader" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.subject.findFirst.mockResolvedValue({ id: "sub1" });

        const createdAt = new Date("2026-03-01T10:00:00Z");
        prismaMock.material.create.mockResolvedValue({
            id: "mat_new",
            title: "CSD201 Bundle",
            type: "MULTIPLE",
            size: 3000,
            createdAt,
        });
        prismaMock.materialFile.createMany.mockResolvedValue({ count: 2 });

        const res = await POST(
            buildMaterialForm({
                title: "CSD201 Bundle",
                semesterId: "sem1",
                subjectId: "sub1",
                uploadedFiles: JSON.stringify([
                    {
                        url: "https://store1.public.blob.vercel-storage.com/p1.pdf",
                        name: "part1.pdf",
                        size: 1000,
                    },
                    {
                        url: "https://store1.public.blob.vercel-storage.com/p2.png",
                        name: "part2.png",
                        size: 2000,
                    },
                ]),
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(prismaMock.material.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: "MULTIPLE",
                    size: 3000,
                    uploadedById: "u_uploader",
                }),
            })
        );
        expect(prismaMock.materialFile.createMany).toHaveBeenCalledTimes(1);
    });
});
