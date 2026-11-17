import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, delMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    delMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
    del: delMock,
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

import { DELETE } from "@/app/api/exam-materials/[id]/route";

describe("DELETE /api/exam-materials/[id]", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
        delMock.mockReset();
        vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob_token_test");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("blocks IDOR deletions by non-uploaders with 403 and returns 404 if missing", async () => {
        const user = createMockUser({ id: "user_other" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "user_other" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.material.findUnique.mockResolvedValueOnce(null);

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/exam-materials/m1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "m1" }) }
                )
            ).status
        ).toBe(404);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.material.findUnique.mockResolvedValueOnce({
            uploadedById: "user_owner",
            fileUrl: "https://store1.public.blob.vercel-storage.com/a.pdf",
            files: [],
        });

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/exam-materials/m1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "m1" }) }
                )
            ).status
        ).toBe(403);
    });

    it("deletes record and purges deduplicated trusted Blob URLs on uploader request", async () => {
        const owner = createMockUser({ id: "user_owner" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "user_owner" }));
        prismaMock.user.findUnique.mockResolvedValue(owner);
        prismaMock.material.findUnique.mockResolvedValue({
            uploadedById: "user_owner",
            fileUrl: "https://store1.public.blob.vercel-storage.com/main.pdf",
            files: [
                { fileUrl: "https://store1.public.blob.vercel-storage.com/main.pdf" },
                { fileUrl: "https://evil.internal/ignore.pdf" },
            ],
        });
        prismaMock.material.delete.mockResolvedValue({});
        delMock.mockResolvedValue(undefined);

        const res = await DELETE(
            buildJsonRequest("http://localhost:3000/api/exam-materials/m1", {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: "m1" }) }
        );
        expect(res.status).toBe(200);
        expect(prismaMock.material.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
        expect(delMock).toHaveBeenCalledWith([
            "https://store1.public.blob.vercel-storage.com/main.pdf",
        ]);
    });
});
