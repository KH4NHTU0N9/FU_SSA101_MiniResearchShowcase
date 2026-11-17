import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession } from "@/test/mocks/session";

const { getSessionMock, clearSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    clearSessionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
    clearSession: clearSessionMock,
}));

import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
        clearSessionMock.mockReset();
    });

    it("rejects cross-origin logout CSRF requests with 403", async () => {
        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/logout", {
                origin: "https://evil.example",
            })
        );
        expect(res.status).toBe(403);
    });

    it("increments user tokenVersion server-side and deletes session cookie", async () => {
        getSessionMock.mockResolvedValue(createMockSession({ id: "user_99" }));
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/logout")
        );
        expect(res.status).toBe(200);
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
            where: { id: "user_99" },
            data: { tokenVersion: { increment: 1 } },
        });
        expect(clearSessionMock).toHaveBeenCalledTimes(1);
    });
});
