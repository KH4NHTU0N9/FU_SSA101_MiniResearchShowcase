import { describe, expect, it } from "vitest";
import {
    WEEKDAYS,
    createFixedEventSchema,
    timeStringSchema,
    toMinutes,
    weekdaySchema,
} from "@/lib/validation/scheduler";

describe("validation/scheduler fixed events & time helpers", () => {
    it("validates 24-hour HH:MM strings and weekday enum values", () => {
        expect(timeStringSchema.safeParse("08:30").success).toBe(true);
        expect(timeStringSchema.safeParse("23:59").success).toBe(true);
        expect(timeStringSchema.safeParse("24:00").success).toBe(false);
        expect(timeStringSchema.safeParse("8:30").success).toBe(false);

        for (const day of WEEKDAYS) {
            expect(weekdaySchema.safeParse(day).success).toBe(true);
        }
        expect(weekdaySchema.safeParse("Funday").success).toBe(false);
        expect(toMinutes("09:45")).toBe(585);
    });

    it("rejects fixed events whose endTime is not strictly after startTime", () => {
        expect(
            createFixedEventSchema.safeParse({
                name: "Linear Algebra",
                day: "Monday",
                startTime: "08:00",
                endTime: "10:00",
            }).success
        ).toBe(true);

        const reversed = createFixedEventSchema.safeParse({
            name: "Linear Algebra",
            day: "Monday",
            startTime: "10:00",
            endTime: "09:30",
        });
        expect(reversed.success).toBe(false);
    });
});
