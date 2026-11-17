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

import { PUT } from "@/app/api/scheduler/tasks/batch/route";

describe("PUT /api/scheduler/tasks/batch", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("aborts batch update with 404 when any taskId is not owned by the caller", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.count.mockResolvedValue(1); // sent 2 unique IDs, only 1 owned

        const res = await PUT(
            buildJsonRequest("http://localhost:3000/api/scheduler/tasks/batch", {
                method: "PUT",
                body: {
                    updates: [
                        { id: "t_owned", assignedSlot: { day: "Monday", startTime: "08:00" } },
                        { id: "t_foreign", assignedSlot: { day: "Tuesday", startTime: "08:00" } },
                    ],
                },
            })
        );
        expect(res.status).toBe(404);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("updates all owned task slots atomically inside $transaction", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.count.mockResolvedValue(2);
        prismaMock.task.update.mockResolvedValue({});

        const res = await PUT(
            buildJsonRequest("http://localhost:3000/api/scheduler/tasks/batch", {
                method: "PUT",
                body: {
                    updates: [
                        { id: "t1", assignedSlot: { day: "Monday", startTime: "08:00" } },
                        { id: "t2", assignedSlot: null },
                    ],
                },
            })
        );
        expect(res.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(prismaMock.task.update).toHaveBeenCalledTimes(2);
    });
});
