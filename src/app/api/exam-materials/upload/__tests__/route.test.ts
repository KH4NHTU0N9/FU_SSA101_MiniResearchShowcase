import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock, handleUploadMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    handleUploadMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

vi.mock("@vercel/blob/client", () => ({
    handleUpload: handleUploadMock,
}));

import { POST } from "@/app/api/exam-materials/upload/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/exam-materials/upload", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        handleUploadMock.mockReset();
    });

    it("rejects cross-origin requests with 403", async () => {
        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/exam-materials/upload", {
                origin: "https://evil.example",
                body: { type: "blob.generate-client-token" },
            })
        );
        expect(res.status).toBe(403);
    });

    it("enforces session, tokenVersion, and file extension checks inside onBeforeGenerateToken", async () => {
        const user = createMockUser({ id: "u1", tokenVersion: 2 });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1", tokenVersion: 2 }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        handleUploadMock.mockImplementation(
            async (opts: {
                onBeforeGenerateToken: (pathname: string) => Promise<Record<string, unknown>>;
            }) => {
                await expect(opts.onBeforeGenerateToken("script.exe")).rejects.toThrow(
                    /Unsupported/
                );
                const tokenConfig = await opts.onBeforeGenerateToken("exam-materials/notes.pdf");
                expect(tokenConfig.addRandomSuffix).toBe(true);
                return { clientToken: "ok" };
            }
        );

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/exam-materials/upload", {
                body: { type: "blob.generate-client-token", payload: {} },
            })
        );
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ clientToken: "ok" });
    });
});
