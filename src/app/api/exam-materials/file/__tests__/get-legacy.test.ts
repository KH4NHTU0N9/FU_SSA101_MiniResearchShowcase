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

import { GET } from "@/app/api/exam-materials/file/route";

describe("GET /api/exam-materials/file — legacy base64 fallback & error guards", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("returns 400 when neither id nor fileId is supplied and 404 when record is absent", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await GET(
                    buildJsonRequest("http://localhost:3000/api/exam-materials/file", {
                        method: "GET",
                    })
                )
            ).status
        ).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.material.findUnique.mockResolvedValue(null);
        expect(
            (
                await GET(
                    buildJsonRequest("http://localhost:3000/api/exam-materials/file?id=missing", {
                        method: "GET",
                    })
                )
            ).status
        ).toBe(404);
    });

    it("decodes legacy base64 data URIs with inline disposition and nosniff header", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        const b64 = Buffer.from("Legacy PDF Bytes", "utf8").toString("base64");
        prismaMock.material.findUnique.mockResolvedValue({
            fileUrl: null,
            fileContent: `data:application/pdf;base64,${b64}`,
            title: "Old Notes",
            type: "PDF",
            files: [],
        });

        const res = await GET(
            buildJsonRequest("http://localhost:3000/api/exam-materials/file?id=legacy_1", {
                method: "GET",
            })
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/pdf");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
        expect(res.headers.get("Content-Disposition")).toContain("inline;");
        expect(await res.text()).toBe("Legacy PDF Bytes");
    });
});
