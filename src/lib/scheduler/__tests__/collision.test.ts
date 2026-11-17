import { describe, expect, it } from "vitest";
import { checkSlotCollision } from "@/lib/scheduler/algorithm";
import type { FixedEventDTO, SchedulerTaskDTO } from "@/types";

describe("lib/scheduler/algorithm collision detection", () => {
    const fixed: FixedEventDTO[] = [
        { id: "fe_1", day: "Monday", startTime: "09:00", endTime: "10:00", name: "Math" },
    ];
    const tasks: SchedulerTaskDTO[] = [
        {
            id: "task_1",
            name: "Revise Notes",
            duration: 1,
            assignedSlot: { day: "Monday", startTime: "14:00" },
        },
    ];

    it("detects direct overlap and 15-minute transition buffer violations around fixed events", () => {
        expect(checkSlotCollision("Monday", 9, 1, fixed, tasks)).toBe(true);
        expect(checkSlotCollision("Monday", 10, 1, fixed, tasks)).toBe(true); // < 10:15 buffer
        expect(checkSlotCollision("Monday", 7.8, 1.2, fixed, tasks)).toBe(true); // ends at 9:00 without 15m buffer
        expect(checkSlotCollision("Monday", 10.25, 1, fixed, tasks)).toBe(false); // 10:15 is valid
    });

    it("respects ignoreTaskId so rescheduling a task does not collide with itself", () => {
        expect(checkSlotCollision("Monday", 14, 1, fixed, tasks)).toBe(true);
        expect(checkSlotCollision("Monday", 14, 1, fixed, tasks, "task_1")).toBe(false);
        expect(checkSlotCollision("Tuesday", 9, 1, fixed, tasks)).toBe(false);
    });
});
