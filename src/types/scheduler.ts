/**
 * Supported days of the week in the Smart Scheduler.
 */
export type WeekdayName =
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";

/**
 * Fixed recurring weekly commitment (classes, shifts, etc.).
 */
export interface FixedEventDTO {
    id: string;
    day: WeekdayName | string;
    startTime: string;
    endTime: string;
    name: string;
}

/**
 * Assigned time slot for a scheduled task.
 */
export interface AssignedSlot {
    day: WeekdayName | string;
    startTime: string;
}

/**
 * Client representation of a study/everyday task.
 */
export interface SchedulerTaskDTO {
    id: string;
    name: string;
    duration: number;
    assignedSlot?: AssignedSlot;
    groupId?: string;
}

/**
 * Event model passed to react-big-calendar DnDCalendar.
 */
export interface SchedulerCalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    isFixed: boolean;
    resourceId: string;
    taskId?: string;
}
