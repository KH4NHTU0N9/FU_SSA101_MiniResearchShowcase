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

import { DELETE } from "@/app/api/scheduler/fixed/[id]/route";

describe("DELETE /api/scheduler/fixed/[id]", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects non-owners with 403 and deletes owned fixed events cleanly", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.fixedEvent.findUnique.mockResolvedValueOnce({
            id: "fe1",
            userId: "someone_else",
        });

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/scheduler/fixed/fe1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "fe1" }) }
                )
            ).status
        ).toBe(403);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.fixedEvent.findUnique.mockResolvedValueOnce({
            id: "fe1",
            userId: "u1",
        });
        prismaMock.fixedEvent.delete.mockResolvedValue({});

        const okRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/scheduler/fixed/fe1", {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: "fe1" }) }
        );
        expect(okRes.status).toBe(200);
        expect(prismaMock.fixedEvent.delete).toHaveBeenCalledWith({ where: { id: "fe1" } });
    });
});
