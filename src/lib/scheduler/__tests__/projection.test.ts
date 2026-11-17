import { describe, expect, it } from "vitest";
import { buildCalendarEvents } from "@/lib/scheduler/algorithm";
import type { FixedEventDTO, SchedulerTaskDTO } from "@/types";

describe("lib/scheduler/algorithm calendar projection", () => {
    it("projects fixed events and scheduled tasks across clamped repeatWeeks", () => {
        const fixed: FixedEventDTO[] = [
            { id: "fe_1", day: "Monday", startTime: "08:00", endTime: "10:00", name: "Bio" },
        ];
        const tasks: SchedulerTaskDTO[] = [
            {
                id: "t1",
                name: "Study Ch.1",
                duration: 2,
                assignedSlot: { day: "Tuesday", startTime: "14:00" },
            },
            {
                id: "t2",
                name: "Unscheduled",
                duration: 1,
            },
        ];

        const refDate = new Date(2026, 2, 4, 12, 0, 0); // Wednesday March 4, 2026
        const events = buildCalendarEvents(fixed, tasks, 3, refDate);
        expect(events).toHaveLength(6); // (1 fixed + 1 scheduled task) * 3 weeks

        const week0Fixed = events.find((e) => e.id === "fe_1-w0");
        const week1Task = events.find((e) => e.id === "t1-w1");
        expect(week0Fixed?.isFixed).toBe(true);
        expect(week0Fixed?.start.getDate()).toBe(2); // Monday March 2
        expect(week0Fixed?.end.getHours()).toBe(10);

        expect(week1Task?.isFixed).toBe(false);
        expect(week1Task?.start.getDate()).toBe(10); // Next Tuesday March 10
        expect(week1Task?.end.getHours()).toBe(16);
    });

    it("clamps invalid repeatWeeks values into [1, 52]", () => {
        const fixed: FixedEventDTO[] = [
            { id: "fe_1", day: "Monday", startTime: "08:00", endTime: "09:00", name: "Math" },
        ];
        expect(buildCalendarEvents(fixed, [], 0)).toHaveLength(1);
        expect(buildCalendarEvents(fixed, [], 100)).toHaveLength(52);
    });
});
