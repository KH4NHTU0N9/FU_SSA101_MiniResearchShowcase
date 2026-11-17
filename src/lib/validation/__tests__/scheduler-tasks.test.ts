import { describe, expect, it } from "vitest";
import {
    batchCreateTasksSchema,
    batchUpdateTasksSchema,
    createTaskSchema,
    patchTaskSchema,
} from "@/lib/validation/scheduler";

describe("validation/scheduler task schemas", () => {
    it("validates single and batch task creation payloads", () => {
        expect(
            createTaskSchema.safeParse({
                name: "Read Chapter 4",
                duration: 2,
                scheduledDay: "Tuesday",
                scheduledStartTime: "14:00",
                groupId: null,
            }).success
        ).toBe(true);

        expect(
            createTaskSchema.safeParse({ name: "Too Long", duration: 15 }).success
        ).toBe(false);

        expect(batchCreateTasksSchema.safeParse({ tasks: [] }).success).toBe(false);
    });

    it("enforces paired nullability in patchTaskSchema and validates batch updates", () => {
        expect(
            patchTaskSchema.safeParse({
                scheduledDay: "Wednesday",
                scheduledStartTime: "10:00",
            }).success
        ).toBe(true);
        expect(
            patchTaskSchema.safeParse({
                scheduledDay: null,
                scheduledStartTime: null,
            }).success
        ).toBe(true);
        expect(
            patchTaskSchema.safeParse({
                scheduledDay: "Wednesday",
                scheduledStartTime: null,
            }).success
        ).toBe(false);

        expect(
            batchUpdateTasksSchema.safeParse({
                updates: [
                    { id: "task_1", assignedSlot: { day: "Friday", startTime: "09:00" } },
                    { id: "task_2", assignedSlot: null },
                ],
            }).success
        ).toBe(true);
    });
});
