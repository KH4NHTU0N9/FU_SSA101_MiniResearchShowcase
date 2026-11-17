import { z } from "zod";
import { boundedString } from "./common";

export const WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
] as const;

export const weekdaySchema = z.enum(WEEKDAYS);

export const timeStringSchema = z
    .string()
    .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Time must use HH:MM 24-hour format");

export function toMinutes(hhmm: string): number {
    const [hours, minutes] = hhmm.split(":").map(Number);
    return hours * 60 + minutes;
}

export const createFixedEventSchema = z
    .object({
        name: boundedString(1, 120, "Activity name"),
        day: weekdaySchema,
        startTime: timeStringSchema,
        endTime: timeStringSchema,
    })
    .refine((data) => toMinutes(data.endTime) > toMinutes(data.startTime), {
        message: "End time must be after start time",
        path: ["endTime"],
    });

export const createTaskSchema = z.object({
    name: boundedString(1, 120, "Task name"),
    duration: z.number().int().min(1).max(12),
    scheduledDay: weekdaySchema.nullable().optional(),
    scheduledStartTime: timeStringSchema.nullable().optional(),
    groupId: z.string().trim().max(64).nullable().optional(),
});

export const batchCreateTasksSchema = z.object({
    tasks: z.array(createTaskSchema).min(1).max(31),
});

export const patchTaskSchema = z
    .object({
        scheduledDay: weekdaySchema.nullable(),
        scheduledStartTime: timeStringSchema.nullable(),
    })
    .refine(
        (data) =>
            (data.scheduledDay === null && data.scheduledStartTime === null) ||
            (data.scheduledDay !== null && data.scheduledStartTime !== null),
        { message: "Both scheduledDay and scheduledStartTime must be set or null together" }
    );

export const batchUpdateTasksSchema = z.object({
    updates: z
        .array(
            z.object({
                id: boundedString(1, 64, "Task ID"),
                assignedSlot: z
                    .object({
                        day: weekdaySchema,
                        startTime: timeStringSchema,
                    })
                    .nullable()
                    .optional(),
            })
        )
        .min(1)
        .max(200),
});
