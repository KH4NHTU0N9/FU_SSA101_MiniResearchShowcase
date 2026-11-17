import { describe, expect, it } from "vitest";
import {
    DAYS_ORDER,
    WEEKDAY_ONLY,
    findAvailableSlotOnDay,
    findFirstAvailableSlot,
    generateWeeklySchedule,
} from "@/lib/scheduler/algorithm";
import type { FixedEventDTO, SchedulerTaskDTO } from "@/types";

describe("lib/scheduler/algorithm slot finding & weekly generation", () => {
    it("finds the first non-conflicting 15-minute aligned slot on a day", () => {
        const fixed: FixedEventDTO[] = [
            { id: "fe_1", day: "Monday", startTime: "08:00", endTime: "09:00", name: "Lecture" },
        ];
        const slot = findAvailableSlotOnDay("Monday", 2, "08:00", "13:00", fixed, []);
        expect(slot).toEqual({ day: "Monday", startTime: "09:15" });

        expect(findAvailableSlotOnDay("Monday", 3, "08:00", "10:00", fixed, [])).toBeUndefined();
    });

    it("falls across subsequent days up to Sunday when earlier days are blocked", () => {
        const fullDays: FixedEventDTO[] = WEEKDAY_ONLY.map((day, idx) => ({
            id: `fe_${idx}`,
            day,
            startTime: "08:00",
            endTime: "22:00",
            name: "Work",
        }));
        expect(findFirstAvailableSlot(1, "08:00", "22:00", fullDays, [])).toEqual({
            day: "Saturday",
            startTime: "08:00",
        });
        expect(
            findFirstAvailableSlot(1, "08:00", "22:00", fullDays, [], undefined, WEEKDAY_ONLY)
        ).toBeUndefined();
    });

    it("schedules multiple tasks without overlaps across the week", () => {
        const fixed: FixedEventDTO[] = [
            { id: "fe_1", day: DAYS_ORDER[0], startTime: "08:00", endTime: "09:00", name: "Lab" },
        ];
        const tasks: SchedulerTaskDTO[] = [
            { id: "t1", name: "Algorithms", duration: 2 },
            { id: "t2", name: "Physics", duration: 1 },
        ];
        const planned = generateWeeklySchedule(tasks, fixed, "08:00", "12:00");
        expect(planned[0].assignedSlot).toEqual({ day: "Monday", startTime: "09:15" });
        // 09:15 + 2h = 11:15 (+15m buffer -> 11:30); 11:30 + 1h = 12:30 > 12:00 -> spills to Tuesday 08:00
        expect(planned[1].assignedSlot).toEqual({ day: "Tuesday", startTime: "08:00" });
    });
});
