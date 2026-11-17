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

import { PATCH } from "@/app/api/scheduler/tasks/[id]/route";

describe("PATCH /api/scheduler/tasks/[id]", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects half-null schedule slots (400) and cross-user updates (403)", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await PATCH(
                    buildJsonRequest("http://localhost:3000/api/scheduler/tasks/t1", {
                        method: "PATCH",
                        body: { scheduledDay: "Monday", scheduledStartTime: null },
                    }),
                    { params: Promise.resolve({ id: "t1" }) }
                )
            ).status
        ).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.findUnique.mockResolvedValue({
            id: "t1",
            userId: "someone_else",
        });

        expect(
            (
                await PATCH(
                    buildJsonRequest("http://localhost:3000/api/scheduler/tasks/t1", {
                        method: "PATCH",
                        body: { scheduledDay: "Monday", scheduledStartTime: "09:00" },
                    }),
                    { params: Promise.resolve({ id: "t1" }) }
                )
            ).status
        ).toBe(403);
    });

    it("updates scheduledDay and scheduledStartTime for owned task", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.findUnique.mockResolvedValue({ id: "t1", userId: "u1" });
        prismaMock.task.update.mockResolvedValue({
            id: "t1",
            scheduledDay: "Thursday",
            scheduledStartTime: "15:30",
        });

        const res = await PATCH(
            buildJsonRequest("http://localhost:3000/api/scheduler/tasks/t1", {
                method: "PATCH",
                body: { scheduledDay: "Thursday", scheduledStartTime: "15:30" },
            }),
            { params: Promise.resolve({ id: "t1" }) }
        );
        expect(res.status).toBe(200);
        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: { scheduledDay: "Thursday", scheduledStartTime: "15:30" },
        });
    });
});
