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

import { POST } from "@/app/api/scheduler/tasks/route";

describe("POST /api/scheduler/tasks", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("enforces duration bounds and creates single task with optional slot", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/scheduler/tasks", {
                        body: { name: "Task", duration: 0 },
                    })
                )
            ).status
        ).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.create.mockResolvedValue({
            id: "t_1",
            userId: "u1",
            name: "Calculus",
            duration: 2,
            scheduledDay: "Tuesday",
            scheduledStartTime: "10:00",
            groupId: null,
        });

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/scheduler/tasks", {
                body: {
                    name: "  Calculus  ",
                    duration: 2,
                    scheduledDay: "Tuesday",
                    scheduledStartTime: "10:00",
                },
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.task.create).toHaveBeenCalledWith({
            data: {
                userId: "u1",
                name: "Calculus",
                duration: 2,
                scheduledDay: "Tuesday",
                scheduledStartTime: "10:00",
                groupId: null,
            },
        });
    });
});
