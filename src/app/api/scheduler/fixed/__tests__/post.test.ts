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

import { POST } from "@/app/api/scheduler/fixed/route";

describe("POST /api/scheduler/fixed", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("rejects reversed intervals (endTime <= startTime) and invalid days with 400", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/scheduler/fixed", {
                        body: {
                            name: "Lecture",
                            day: "Monday",
                            startTime: "12:00",
                            endTime: "10:00",
                        },
                    })
                )
            ).status
        ).toBe(400);
    });

    it("persists valid fixed event and returns 201", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.fixedEvent.create.mockResolvedValue({
            id: "fe_new",
            userId: "u1",
            name: "Lecture",
            day: "Monday",
            startTime: "08:00",
            endTime: "10:00",
        });

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/scheduler/fixed", {
                body: {
                    name: "  Lecture  ",
                    day: "Monday",
                    startTime: "08:00",
                    endTime: "10:00",
                },
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.fixedEvent.create).toHaveBeenCalledWith({
            data: {
                userId: "u1",
                name: "Lecture",
                day: "Monday",
                startTime: "08:00",
                endTime: "10:00",
            },
        });
    });
});
