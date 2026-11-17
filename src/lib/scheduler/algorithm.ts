import type {
    AssignedSlot,
    FixedEventDTO,
    SchedulerCalendarEvent,
    SchedulerTaskDTO,
    WeekdayName,
} from "@/types";

export const DAYS_ORDER: WeekdayName[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

export const WEEKDAY_ONLY: WeekdayName[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
];

export const BUFFER_HOURS = 0.25; // 15-minute transition buffer between consecutive blocks
export const SLOT_STEP_HOURS = 0.25; // 15-minute scheduling granularity

/**
 * Converts a 24-hour "HH:MM" string to fractional hours (e.g. "08:30" -> 8.5).
 */
export function timeToFloat(time: string): number {
    const [h, m] = time.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h + m / 60;
}

/**
 * Converts fractional hours back to zero-padded "HH:MM" 24-hour format.
 */
export function floatToTime(val: number): string {
    const totalMinutes = Math.round(val * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Validates that an allowed schedule window has a valid start < end range.
 */
export function isValidTimeWindow(startTime: string, endTime: string): boolean {
    return timeToFloat(endTime) > timeToFloat(startTime);
}

/**
 * Checks whether placing a block on `day` at `[start, start + duration)` collides with
 * any fixed event or other scheduled task, preserving a 15-minute buffer.
 */
export function checkSlotCollision(
    day: string,
    start: number,
    duration: number,
    fixedEvents: readonly FixedEventDTO[],
    tasks: readonly SchedulerTaskDTO[],
    ignoreTaskId?: string
): boolean {
    const end = start + duration;

    const hitsFixed = fixedEvents.some((ev) => {
        if (ev.day !== day) return false;
        const evStart = timeToFloat(ev.startTime);
        const evEnd = timeToFloat(ev.endTime);
        return start < evEnd + BUFFER_HOURS && end > evStart - BUFFER_HOURS;
    });
    if (hitsFixed) return true;

    return tasks.some((t) => {
        if (t.id === ignoreTaskId || !t.assignedSlot) return false;
        if (t.assignedSlot.day !== day) return false;
        const tStart = timeToFloat(t.assignedSlot.startTime);
        const tEnd = tStart + t.duration;
        return start < tEnd + BUFFER_HOURS && end > tStart - BUFFER_HOURS;
    });
}

/**
 * Finds the first available slot on a specific day within `[allowedStart, allowedEnd]`.
 */
export function findAvailableSlotOnDay(
    day: WeekdayName,
    duration: number,
    allowedStartTime: string,
    allowedEndTime: string,
    fixedEvents: readonly FixedEventDTO[],
    tasks: readonly SchedulerTaskDTO[],
    ignoreTaskId?: string
): AssignedSlot | undefined {
    const startBound = timeToFloat(allowedStartTime);
    const endBound = timeToFloat(allowedEndTime);
    if (endBound <= startBound || duration <= 0) return undefined;

    for (let hour = startBound; hour + duration <= endBound + 1e-6; hour += SLOT_STEP_HOURS) {
        if (!checkSlotCollision(day, hour, duration, fixedEvents, tasks, ignoreTaskId)) {
            return {
                day,
                startTime: floatToTime(hour),
            };
        }
    }

    return undefined;
}

/**
 * Finds the first open slot across all weekdays Monday through Sunday.
 */
export function findFirstAvailableSlot(
    duration: number,
    allowedStartTime: string,
    allowedEndTime: string,
    fixedEvents: readonly FixedEventDTO[],
    tasks: readonly SchedulerTaskDTO[],
    ignoreTaskId?: string,
    days: readonly WeekdayName[] = DAYS_ORDER
): AssignedSlot | undefined {
    for (const day of days) {
        const slot = findAvailableSlotOnDay(
            day,
            duration,
            allowedStartTime,
            allowedEndTime,
            fixedEvents,
            tasks,
            ignoreTaskId
        );
        if (slot) return slot;
    }
    return undefined;
}

/**
 * Recalculates greedy non-overlapping weekly slots for all tasks.
 */
export function generateWeeklySchedule(
    tasks: readonly SchedulerTaskDTO[],
    fixedEvents: readonly FixedEventDTO[],
    allowedStartTime: string,
    allowedEndTime: string
): SchedulerTaskDTO[] {
    const planned: SchedulerTaskDTO[] = tasks.map((t) => ({
        ...t,
        assignedSlot: undefined,
    }));

    for (let i = 0; i < planned.length; i++) {
        const task = planned[i];
        const slot = findFirstAvailableSlot(
            task.duration,
            allowedStartTime,
            allowedEndTime,
            fixedEvents,
            planned,
            task.id
        );
        if (slot) {
            planned[i].assignedSlot = slot;
        }
    }

    return planned;
}

/**
 * Resolves the Date in the current Monday-first week (Monday=0 .. Sunday=6) matching `dayName`.
 */
export function getMondayWeekDate(dayName: string, referenceDate: Date = new Date()): Date {
    const targetMondayIndex = DAYS_ORDER.indexOf(dayName as WeekdayName);
    const safeTargetIndex = targetMondayIndex >= 0 ? targetMondayIndex : 0;

    // JS Date.getDay(): Sun=0, Mon=1..Sat=6 -> Monday-first index: Mon=0..Sun=6
    const jsDay = referenceDate.getDay();
    const currentMondayIndex = (jsDay + 6) % 7;

    const result = new Date(referenceDate);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() + (safeTargetIndex - currentMondayIndex));
    return result;
}

/**
 * Projects fixed events and scheduled tasks across `repeatWeeks` into react-big-calendar events.
 */
export function buildCalendarEvents(
    fixedEvents: readonly FixedEventDTO[],
    tasks: readonly SchedulerTaskDTO[],
    repeatWeeks: number,
    referenceDate: Date = new Date()
): SchedulerCalendarEvent[] {
    const clampedWeeks = Math.max(1, Math.min(52, Math.trunc(repeatWeeks) || 1));
    const events: SchedulerCalendarEvent[] = [];

    for (let w = 0; w < clampedWeeks; w++) {
        const dayOffset = w * 7;

        for (const fe of fixedEvents) {
            const baseDate = getMondayWeekDate(fe.day, referenceDate);
            const [sH, sM] = fe.startTime.split(":").map(Number);
            const [eH, eM] = fe.endTime.split(":").map(Number);

            const start = new Date(baseDate);
            start.setDate(start.getDate() + dayOffset);
            start.setHours(sH, sM, 0, 0);

            const end = new Date(baseDate);
            end.setDate(end.getDate() + dayOffset);
            end.setHours(eH, eM, 0, 0);

            events.push({
                id: `${fe.id}-w${w}`,
                title: fe.name,
                start,
                end,
                isFixed: true,
                resourceId: fe.id,
            });
        }

        for (const task of tasks) {
            if (!task.assignedSlot) continue;
            const baseDate = getMondayWeekDate(task.assignedSlot.day, referenceDate);
            const startFloat = timeToFloat(task.assignedSlot.startTime);
            const sH = Math.floor(startFloat);
            const sM = Math.round((startFloat - sH) * 60);

            const endFloat = startFloat + task.duration;
            const eH = Math.floor(endFloat);
            const eM = Math.round((endFloat - eH) * 60);

            const start = new Date(baseDate);
            start.setDate(start.getDate() + dayOffset);
            start.setHours(sH, sM, 0, 0);

            const end = new Date(baseDate);
            end.setDate(end.getDate() + dayOffset);
            end.setHours(eH, eM, 0, 0);

            events.push({
                id: `${task.id}-w${w}`,
                title: task.name,
                start,
                end,
                isFixed: false,
                resourceId: task.id,
                taskId: task.id,
            });
        }
    }

    return events;
}
