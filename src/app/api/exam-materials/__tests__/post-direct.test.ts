import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRawRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, putMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    putMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
    put: putMock,
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

describe("POST /api/exam-materials — direct server file uploads", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        putMock.mockReset();
        vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_test_token");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("returns 503 without BLOB_READ_WRITE_TOKEN and blocks disallowed .exe extensions", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.subject.findFirst.mockResolvedValue({ id: "sub1" });

        vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
        const missingTokenForm = new FormData();
        missingTokenForm.set("title", "Test");
        missingTokenForm.set("semesterId", "sem1");
        missingTokenForm.set("subjectId", "sub1");
        missingTokenForm.append(
            "files",
            new File(["hello"], "notes.pdf", { type: "application/pdf" })
        );
        expect(
            (
                await POST(
                    buildRawRequest("http://localhost:3000/api/exam-materials", {
                        rawBody: missingTokenForm,
                    })
                )
            ).status
        ).toBe(503);

        vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_test_token");
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.subject.findFirst.mockResolvedValue({ id: "sub1" });
        const exeForm = new FormData();
        exeForm.set("title", "Exe");
        exeForm.set("semesterId", "sem1");
        exeForm.set("subjectId", "sub1");
        exeForm.append("files", new File(["MZ"], "payload.exe", { type: "application/octet-stream" }));
        expect(
            (
                await POST(
                    buildRawRequest("http://localhost:3000/api/exam-materials", {
                        rawBody: exeForm,
                    })
                )
            ).status
        ).toBe(400);
    });

    it("uploads valid direct files via @vercel/blob put and persists Material record", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.subject.findFirst.mockResolvedValue({ id: "sub1" });

        putMock.mockResolvedValue({
            url: "https://store1.public.blob.vercel-storage.com/exam-materials/notes-rand.pdf",
        });
        prismaMock.material.create.mockResolvedValue({
            id: "mat_direct",
            title: "Direct Note",
            type: "PDF",
            size: 12,
            createdAt: new Date(),
        });
        prismaMock.materialFile.createMany.mockResolvedValue({ count: 1 });

        const form = new FormData();
        form.set("title", "Direct Note");
        form.set("semesterId", "sem1");
        form.set("subjectId", "sub1");
        form.append("files", new File(["pdf-contents"], "notes.pdf", { type: "application/pdf" }));

        const res = await POST(
            buildRawRequest("http://localhost:3000/api/exam-materials", { rawBody: form })
        );
        expect(res.status).toBe(201);
        expect(putMock).toHaveBeenCalledTimes(1);
    });
});
