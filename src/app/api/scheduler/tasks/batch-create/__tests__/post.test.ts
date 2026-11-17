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

import { POST } from "@/app/api/scheduler/tasks/batch-create/route";

describe("POST /api/scheduler/tasks/batch-create", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects empty arrays (400) and CSRF (403), and creates everyday tasks transactionally", async () => {
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/scheduler/tasks/batch-create", {
                        origin: "https://evil.example",
                        body: { tasks: [] },
                    })
                )
            ).status
        ).toBe(403);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/scheduler/tasks/batch-create", {
                        body: { tasks: [] },
                    })
                )
            ).status
        ).toBe(400);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.create
            .mockResolvedValueOnce({ id: "t1", name: "Jog" })
            .mockResolvedValueOnce({ id: "t2", name: "Jog" });

        const okRes = await POST(
            buildJsonRequest("http://localhost:3000/api/scheduler/tasks/batch-create", {
                body: {
                    tasks: [
                        {
                            name: "Jog",
                            duration: 1,
                            scheduledDay: "Monday",
                            scheduledStartTime: "07:00",
                            groupId: "g1",
                        },
                        {
                            name: "Jog",
                            duration: 1,
                            scheduledDay: "Tuesday",
                            scheduledStartTime: "07:00",
                            groupId: "g1",
                        },
                    ],
                },
            })
        );
        expect(okRes.status).toBe(201);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(await okRes.json()).toHaveLength(2);
    });
});
