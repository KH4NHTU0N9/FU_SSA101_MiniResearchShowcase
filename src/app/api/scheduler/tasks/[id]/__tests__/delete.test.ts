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

import { DELETE } from "@/app/api/scheduler/tasks/[id]/route";

describe("DELETE /api/scheduler/tasks/[id]", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects IDOR attempts with 403 and cascades deleteMany when groupId is set", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.findUnique.mockResolvedValueOnce({
            id: "t1",
            userId: "other_user",
            groupId: null,
        });

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/scheduler/tasks/t1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "t1" }) }
                )
            ).status
        ).toBe(403);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.findUnique.mockResolvedValueOnce({
            id: "t_group_item",
            userId: "u1",
            groupId: "grp_daily",
        });
        prismaMock.task.deleteMany.mockResolvedValue({ count: 7 });

        const okGrouped = await DELETE(
            buildJsonRequest("http://localhost:3000/api/scheduler/tasks/t_group_item", {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: "t_group_item" }) }
        );
        expect(okGrouped.status).toBe(200);
        expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
            where: { userId: "u1", groupId: "grp_daily" },
        });
    });

    it("deletes solitary task when groupId is null", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.findUnique.mockResolvedValue({
            id: "t_single",
            userId: "u1",
            groupId: null,
        });
        prismaMock.task.delete.mockResolvedValue({});

        const okSingle = await DELETE(
            buildJsonRequest("http://localhost:3000/api/scheduler/tasks/t_single", {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: "t_single" }) }
        );
        expect(okSingle.status).toBe(200);
        expect(prismaMock.task.delete).toHaveBeenCalledWith({ where: { id: "t_single" } });
    });
});
