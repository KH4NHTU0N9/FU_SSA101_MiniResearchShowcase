import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

import { GET } from "@/app/api/exam-materials/file/route";

describe("GET /api/exam-materials/file — remote Blob serving & SSRF defense", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("blocks non-Blob internal metadata URLs with 403 SSRF rejection", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.materialFile.findUnique.mockResolvedValue({
            fileUrl: "http://169.254.169.254/latest/meta-data",
            fileContent: null,
            name: "secret.txt",
            materialId: "m1",
        });

        const res = await GET(
            buildJsonRequest("http://localhost:3000/api/exam-materials/file?fileId=f_ssrf", {
                method: "GET",
            })
        );
        expect(res.status).toBe(403);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("streams attachment with nosniff and bumps totalDownloads when download=1", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.materialFile.findUnique.mockResolvedValue({
            fileUrl: "https://store1.public.blob.vercel-storage.com/guide.pdf",
            fileContent: null,
            name: "Exam Guide.pdf",
            materialId: "mat_1",
        });
        prismaMock.material.update.mockResolvedValue({});
        fetchMock.mockResolvedValue(
            new Response(new Uint8Array([1, 2, 3]), {
                status: 200,
                headers: { "Content-Type": "application/pdf" },
            })
        );

        const res = await GET(
            buildJsonRequest(
                "http://localhost:3000/api/exam-materials/file?fileId=f1&download=1",
                { method: "GET" }
            )
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/pdf");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
        expect(res.headers.get("Content-Disposition")).toContain("attachment;");
        expect(prismaMock.material.update).toHaveBeenCalledWith({
            where: { id: "mat_1" },
            data: { totalDownloads: { increment: 1 } },
        });
    });

    it("redirects cleanly to trusted Blob URL during inline preview (download!=1)", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.materialFile.findUnique.mockResolvedValue({
            fileUrl: "https://store1.public.blob.vercel-storage.com/preview.pdf",
            fileContent: null,
            name: "preview.pdf",
            materialId: "mat_1",
        });

        const res = await GET(
            buildJsonRequest("http://localhost:3000/api/exam-materials/file?fileId=f1", {
                method: "GET",
            })
        );
        expect(res.status).toBe(307);
        expect(res.headers.get("Location")).toBe(
            "https://store1.public.blob.vercel-storage.com/preview.pdf"
        );
        expect(prismaMock.material.update).not.toHaveBeenCalled();
    });
});
