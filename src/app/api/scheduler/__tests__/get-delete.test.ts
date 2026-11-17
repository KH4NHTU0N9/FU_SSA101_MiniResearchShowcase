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

import { DELETE, GET } from "@/app/api/scheduler/route";

describe("GET & DELETE /api/scheduler", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("returns user-scoped fixedEvents and tasks on GET", async () => {
        getSessionMock.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);

        const user = createMockUser({ id: "u_sched" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_sched" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.fixedEvent.findMany.mockResolvedValue([{ id: "fe1", name: "Math" }]);
        prismaMock.task.findMany.mockResolvedValue([{ id: "t1", name: "Study" }]);

        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            fixedEvents: [{ id: "fe1", name: "Math" }],
            tasks: [{ id: "t1", name: "Study" }],
        });
    });

    it("enforces origin guard and clears user tasks & fixed events in a transaction on DELETE", async () => {
        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/scheduler", {
                        method: "DELETE",
                        origin: "https://evil.example",
                    })
                )
            ).status
        ).toBe(403);

        const user = createMockUser({ id: "u_sched" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_sched" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.task.deleteMany.mockResolvedValue({ count: 2 });
        prismaMock.fixedEvent.deleteMany.mockResolvedValue({ count: 1 });

        const okRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/scheduler", { method: "DELETE" })
        );
        expect(okRes.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
});
