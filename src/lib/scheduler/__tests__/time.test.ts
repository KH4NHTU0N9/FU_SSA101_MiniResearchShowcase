import { describe, expect, it } from "vitest";
import {
    floatToTime,
    getMondayWeekDate,
    isValidTimeWindow,
    timeToFloat,
} from "@/lib/scheduler/algorithm";

describe("lib/scheduler/algorithm time helpers", () => {
    it("converts between HH:MM strings and fractional hours accurately", () => {
        expect(timeToFloat("08:30")).toBe(8.5);
        expect(timeToFloat("14:15")).toBe(14.25);
        expect(timeToFloat("bad")).toBe(0);

        expect(floatToTime(8.5)).toBe("08:30");
        expect(floatToTime(14.25)).toBe("14:15");
        expect(floatToTime(0)).toBe("00:00");
    });

    it("validates start < end time windows", () => {
        expect(isValidTimeWindow("08:00", "22:00")).toBe(true);
        expect(isValidTimeWindow("08:00", "08:00")).toBe(false);
        expect(isValidTimeWindow("22:00", "08:00")).toBe(false);
    });

    it("resolves weekday dates relative to Monday-first week even on Sundays", () => {
        // Sunday March 8, 2026 -> Monday of that week is March 2, 2026
        const sundayRef = new Date(2026, 2, 8, 15, 0, 0);
        const resolvedMonday = getMondayWeekDate("Monday", sundayRef);
        const resolvedSunday = getMondayWeekDate("Sunday", sundayRef);

        expect(resolvedMonday.getFullYear()).toBe(2026);
        expect(resolvedMonday.getMonth()).toBe(2);
        expect(resolvedMonday.getDate()).toBe(2);

        expect(resolvedSunday.getDate()).toBe(8);
    });
});
