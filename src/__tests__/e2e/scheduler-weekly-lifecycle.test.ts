import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest, buildRawRequest } from "@/test/mocks/next";

const { cookieJar, userRecord, fixedEvents, tasks } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    userRecord: {
        id: "u-sched-1",
        email: "sched@fpt.edu.vn",
        name: "Hoa",
        tokenVersion: 1,
    },
    fixedEvents: [] as Array<{
        id: string;
        userId: string;
        name: string;
        day: string;
        startTime: string;
        endTime: string;
        createdAt: Date;
    }>,
    tasks: [] as Array<{
        id: string;
        userId: string;
        name: string;
        duration: number;
        scheduledDay: string | null;
        scheduledStartTime: string | null;
        groupId: string | null;
        createdAt: Date;
    }>,
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => {
            const val = cookieJar.get(name);
            return val ? { name, value: val } : undefined;
        },
        set: (name: string, value: string) => {
            cookieJar.set(name, value);
        },
        delete: (name: string) => {
            cookieJar.delete(name);
        },
    }),
}));

vi.mock("@/lib/prisma", () => {
    const models = {
        user: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                where.id === userRecord.id ? userRecord : null,
        },
        fixedEvent: {
            findMany: async ({ where }: { where: { userId: string } }) =>
                fixedEvents.filter((e) => e.userId === where.userId),
            create: async ({
                data,
            }: {
                data: { userId: string; name: string; day: string; startTime: string; endTime: string };
            }) => {
                const row = { id: `fe-${fixedEvents.length + 1}`, ...data, createdAt: new Date() };
                fixedEvents.push(row);
                return row;
            },
            deleteMany: async ({ where }: { where: { userId: string } }) => {
                for (let i = fixedEvents.length - 1; i >= 0; i--) {
                    if (fixedEvents[i].userId === where.userId) fixedEvents.splice(i, 1);
                }
                return { count: 1 };
            },
        },
        task: {
            findMany: async ({ where }: { where: { userId: string } }) =>
                tasks.filter((t) => t.userId === where.userId),
            count: async ({ where }: { where: { id: { in: string[] }; userId: string } }) =>
                tasks.filter((t) => t.userId === where.userId && where.id.in.includes(t.id)).length,
            findUnique: async ({ where }: { where: { id: string } }) =>
                tasks.find((t) => t.id === where.id) ?? null,
            create: async ({
                data,
            }: {
                data: {
                    userId: string;
                    name: string;
                    duration: number;
                    scheduledDay: string | null;
                    scheduledStartTime: string | null;
                    groupId: string | null;
                };
            }) => {
                const row = { id: `task-${tasks.length + 1}`, ...data, createdAt: new Date() };
                tasks.push(row);
                return row;
            },
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: { scheduledDay: string | null; scheduledStartTime: string | null };
            }) => {
                const row = tasks.find((t) => t.id === where.id);
                if (row) {
                    row.scheduledDay = data.scheduledDay;
                    row.scheduledStartTime = data.scheduledStartTime;
                }
                return row;
            },
            deleteMany: async ({ where }: { where: { userId: string } }) => {
                for (let i = tasks.length - 1; i >= 0; i--) {
                    if (tasks[i].userId === where.userId) tasks.splice(i, 1);
                }
                return { count: 1 };
            },
        },
    };
    return {
        prisma: {
            ...models,
            $transaction: async <T,>(
                arg: Promise<unknown>[] | ((tx: typeof models) => Promise<T>)
            ): Promise<T> => {
                if (Array.isArray(arg)) {
                    return (await Promise.all(arg)) as unknown as T;
                }
                return arg(models);
            },
        },
    };
});

import { setSession } from "@/lib/session";
import { GET as getScheduler, DELETE as resetScheduler } from "@/app/api/scheduler/route";
import { POST as createFixed } from "@/app/api/scheduler/fixed/route";
import { POST as createTask } from "@/app/api/scheduler/tasks/route";
import { PUT as batchUpdate } from "@/app/api/scheduler/tasks/batch/route";
import { PATCH as patchTask } from "@/app/api/scheduler/tasks/[id]/route";

describe("e2e/scheduler-weekly-lifecycle", () => {
    beforeEach(async () => {
        cookieJar.clear();
        fixedEvents.length = 0;
        tasks.length = 0;
        await setSession(userRecord);
    });

    it("adds fixed event, creates flexible task, batch-schedules it, drags/patches slot, and resets cleanly", async () => {
        const fixedRes = await createFixed(
            buildJsonRequest("http://localhost/api/scheduler/fixed", {
                method: "POST",
                body: {
                    name: "MAD101",
                    day: "Monday",
                    startTime: "08:00",
                    endTime: "10:00",
                },
            })
        );
        expect(fixedRes.status).toBe(201);

        const taskRes = await createTask(
            buildJsonRequest("http://localhost/api/scheduler/tasks", {
                method: "POST",
                body: { name: "Revise Proofs", duration: 2 },
            })
        );
        expect(taskRes.status).toBe(201);
        const task = await taskRes.json();

        const batchRes = await batchUpdate(
            buildJsonRequest("http://localhost/api/scheduler/tasks/batch", {
                method: "PUT",
                body: {
                    updates: [
                        { id: task.id, assignedSlot: { day: "Tuesday", startTime: "10:00" } },
                    ],
                },
            })
        );
        expect(batchRes.status).toBe(200);

        const patchRes = await patchTask(
            buildJsonRequest(`http://localhost/api/scheduler/tasks/${task.id}`, {
                method: "PATCH",
                body: { scheduledDay: "Wednesday", scheduledStartTime: "14:00" },
            }),
            { params: Promise.resolve({ id: task.id }) }
        );
        expect(patchRes.status).toBe(200);

        const loaded = await (await getScheduler()).json();
        expect(loaded.fixedEvents).toHaveLength(1);
        expect(loaded.tasks[0].scheduledDay).toBe("Wednesday");

        const resetRes = await resetScheduler(
            buildRawRequest("http://localhost/api/scheduler", { method: "DELETE" })
        );
        expect(resetRes.status).toBe(200);
        expect(fixedEvents).toHaveLength(0);
        expect(tasks).toHaveLength(0);
    });
});
