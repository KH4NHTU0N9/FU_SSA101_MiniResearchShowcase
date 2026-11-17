"use client";

import { useEffect, useMemo, useState } from "react";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar as BigCalendar, dateFnsLocalizer, type EventProps } from "react-big-calendar";
import withDragAndDrop, {
    type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { Calendar, Plus, RotateCcw, Trash2 } from "lucide-react";
import ProtectedRoute from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
    DAYS_ORDER,
    WEEKDAY_ONLY,
    buildCalendarEvents,
    checkSlotCollision,
    findAvailableSlotOnDay,
    findFirstAvailableSlot,
    floatToTime,
    generateWeeklySchedule,
    isValidTimeWindow,
} from "@/lib/scheduler/algorithm";
import { cn } from "@/lib/utils";
import type {
    AssignedSlot,
    FixedEventDTO,
    SchedulerCalendarEvent,
    SchedulerTaskDTO,
    WeekdayName,
} from "@/types";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./rbc-dark.css";

const JS_WEEKDAYS: WeekdayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales: { "en-US": enUS },
});

const DnDCalendar = withDragAndDrop<SchedulerCalendarEvent>(BigCalendar);

interface RawTaskRow {
    id: string;
    name: string;
    duration: number;
    groupId?: string | null;
    scheduledDay?: string | null;
    scheduledStartTime?: string | null;
}

function hydrateTask(row: RawTaskRow): SchedulerTaskDTO {
    return {
        id: row.id,
        name: row.name,
        duration: row.duration,
        groupId: row.groupId || undefined,
        assignedSlot:
            row.scheduledDay && row.scheduledStartTime
                ? { day: row.scheduledDay, startTime: row.scheduledStartTime }
                : undefined,
    };
}

function CustomCalendarEvent({ event }: EventProps<SchedulerCalendarEvent>) {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="font-bold truncate text-[0.8rem] leading-tight">{event.title}</div>
            <div className="text-[10px] opacity-85 leading-tight mt-0.5">
                {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
            </div>
        </div>
    );
}

export default function SchedulerPage() {
    return (
        <ProtectedRoute>
            <SchedulerContent />
        </ProtectedRoute>
    );
}

function SchedulerContent() {
    const { showToast, confirmAction } = useToast();

    const [fixedEvents, setFixedEvents] = useState<FixedEventDTO[]>([]);
    const [tasks, setTasks] = useState<SchedulerTaskDTO[]>([]);
    const [generated, setGenerated] = useState(false);

    const [allowedStartTime, setAllowedStartTime] = useState("08:00");
    const [allowedEndTime, setAllowedEndTime] = useState("22:00");

    const [newEvent, setNewEvent] = useState<{
        name: string;
        day: WeekdayName;
        startTime: string;
        endTime: string;
    }>({
        name: "",
        day: "Monday",
        startTime: "08:00",
        endTime: "10:00",
    });
    const [everydayTask, setEverydayTask] = useState({ name: "", duration: 1 });
    const [includeWeekends, setIncludeWeekends] = useState(true);
    const [normalTask, setNormalTask] = useState({ name: "", duration: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [repeatWeeks, setRepeatWeeks] = useState(4);

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                const res = await fetch("/api/scheduler", { signal: controller.signal });
                if (!res.ok) {
                    showToast("Failed to load saved schedule.", "error");
                    return;
                }
                const data = (await res.json()) as {
                    fixedEvents?: FixedEventDTO[];
                    tasks?: RawTaskRow[];
                };
                setFixedEvents(data.fixedEvents ?? []);
                const hydrated = (data.tasks ?? []).map(hydrateTask);
                setTasks(hydrated);
                if (hydrated.some((t) => Boolean(t.assignedSlot))) {
                    setGenerated(true);
                }
            } catch (error) {
                if ((error as Error)?.name !== "AbortError") {
                    showToast("Network error loading scheduler data.", "error");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        void fetchData();
        return () => controller.abort();
    }, [showToast]);

    const addFixedEvent = async () => {
        const trimmedName = newEvent.name.trim();
        if (!trimmedName) return;

        if (!isValidTimeWindow(newEvent.startTime, newEvent.endTime)) {
            showToast("Fixed event end time must be after start time.", "error");
            return;
        }

        try {
            const res = await fetch("/api/scheduler/fixed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newEvent, name: trimmedName }),
            });
            const data = (await res.json().catch(() => ({}))) as FixedEventDTO & {
                error?: string;
            };

            if (!res.ok) {
                showToast(data.error || "Could not add fixed event.", "error");
                return;
            }
            setFixedEvents((prev) => [...prev, data]);
            setNewEvent((prev) => ({ ...prev, name: "" }));
            showToast("Fixed event added.", "success");
        } catch {
            showToast("Network error adding fixed event.", "error");
        }
    };

    const addEverydayTask = async () => {
        const trimmedName = everydayTask.name.trim();
        if (!trimmedName) return;

        if (!isValidTimeWindow(allowedStartTime, allowedEndTime)) {
            showToast("Allowed schedule end time must be after start time.", "error");
            return;
        }

        const daysToSchedule = includeWeekends ? DAYS_ORDER : WEEKDAY_ONLY;
        const groupId = crypto.randomUUID();
        const localTasksClone = [...tasks];
        const optimisticTasks: SchedulerTaskDTO[] = [];
        const newTasksParams: Array<{
            name: string;
            duration: number;
            scheduledDay: string;
            scheduledStartTime: string;
            groupId: string;
        }> = [];

        for (const day of daysToSchedule) {
            const slot = findAvailableSlotOnDay(
                day,
                everydayTask.duration,
                allowedStartTime,
                allowedEndTime,
                fixedEvents,
                localTasksClone
            );

            if (slot) {
                const tempTask: SchedulerTaskDTO = {
                    id: `temp-${groupId}-${day}`,
                    name: trimmedName,
                    duration: everydayTask.duration,
                    assignedSlot: slot,
                    groupId,
                };
                localTasksClone.push(tempTask);
                optimisticTasks.push(tempTask);
                newTasksParams.push({
                    name: trimmedName,
                    duration: everydayTask.duration,
                    scheduledDay: slot.day,
                    scheduledStartTime: slot.startTime,
                    groupId,
                });
            }
        }

        if (newTasksParams.length === 0) {
            showToast("No available daily time slots found within allowed hours.", "error");
            return;
        }

        setTasks((prev) => [...prev, ...optimisticTasks]);
        setEverydayTask((prev) => ({ ...prev, name: "" }));
        setGenerated(true);

        try {
            const res = await fetch("/api/scheduler/tasks/batch-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tasks: newTasksParams }),
            });

            if (!res.ok) {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                setTasks((prev) => prev.filter((t) => t.groupId !== groupId));
                showToast(errData.error || "Failed to save recurring task.", "error");
                return;
            }

            const createdTasks = (await res.json()) as RawTaskRow[];
            const hydratedTasks = createdTasks.map(hydrateTask);
            setTasks((prev) => {
                const withoutTemp = prev.filter(
                    (t) => t.groupId !== groupId || !t.id.startsWith("temp-")
                );
                return [...withoutTemp, ...hydratedTasks];
            });

            if (hydratedTasks.length < daysToSchedule.length) {
                showToast(
                    `Scheduled on ${hydratedTasks.length}/${daysToSchedule.length} days due to conflicts.`,
                    "info"
                );
            } else {
                showToast("Everyday task added to schedule.", "success");
            }
        } catch {
            setTasks((prev) => prev.filter((t) => t.groupId !== groupId));
            showToast("Network error creating everyday tasks.", "error");
        }
    };

    const addNormalTask = async () => {
        const trimmedName = normalTask.name.trim();
        if (!trimmedName) return;

        const slot = isValidTimeWindow(allowedStartTime, allowedEndTime)
            ? findFirstAvailableSlot(
                  normalTask.duration,
                  allowedStartTime,
                  allowedEndTime,
                  fixedEvents,
                  tasks
              )
            : undefined;

        try {
            const res = await fetch("/api/scheduler/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: trimmedName,
                    duration: normalTask.duration,
                    scheduledDay: slot?.day,
                    scheduledStartTime: slot?.startTime,
                }),
            });

            const data = (await res.json().catch(() => ({}))) as RawTaskRow & { error?: string };
            if (!res.ok) {
                showToast(data.error || "Failed to add task.", "error");
                return;
            }

            const hydrated = hydrateTask(data);
            setTasks((prev) => [...prev, hydrated]);
            setNormalTask((prev) => ({ ...prev, name: "" }));
            if (slot) {
                setGenerated(true);
            } else {
                showToast("Task saved, but no free slot was available in allowed hours.", "info");
            }
        } catch {
            showToast("Network error adding task.", "error");
        }
    };

    const removeFixed = async (id: string) => {
        try {
            const res = await fetch(`/api/scheduler/fixed/${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to delete fixed event.", "error");
                return;
            }
            setFixedEvents((prev) => prev.filter((e) => e.id !== id));
            showToast("Fixed event removed.", "info");
        } catch {
            showToast("Network error deleting fixed event.", "error");
        }
    };

    const removeTask = async (task: SchedulerTaskDTO) => {
        try {
            const res = await fetch(`/api/scheduler/tasks/${encodeURIComponent(task.id)}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to delete task.", "error");
                return;
            }

            setTasks((prev) =>
                task.groupId
                    ? prev.filter((t) => t.groupId !== task.groupId)
                    : prev.filter((t) => t.id !== task.id)
            );
            showToast("Task removed.", "info");
        } catch {
            showToast("Network error removing task.", "error");
        }
    };

    const handleResetAll = async () => {
        const confirmed = await confirmAction({
            title: "Clear your entire schedule?",
            description: "All fixed events and tasks will be permanently deleted.",
            confirmLabel: "Clear All",
            cancelLabel: "Cancel",
            destructive: true,
        });
        if (!confirmed) return;

        try {
            const res = await fetch("/api/scheduler", { method: "DELETE" });
            if (!res.ok) {
                showToast("Failed to reset schedule on the server.", "error");
                return;
            }
            setFixedEvents([]);
            setTasks([]);
            setGenerated(false);
            showToast("Schedule cleared.", "info");
        } catch {
            showToast("Network error resetting schedule.", "error");
        }
    };

    const generateSchedule = async () => {
        if (!isValidTimeWindow(allowedStartTime, allowedEndTime)) {
            showToast("Allowed schedule end time must be after start time.", "error");
            return;
        }

        const previousTasks = tasks;
        const planned = generateWeeklySchedule(
            tasks,
            fixedEvents,
            allowedStartTime,
            allowedEndTime
        );

        setTasks(planned);
        setGenerated(true);

        try {
            const res = await fetch("/api/scheduler/tasks/batch", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    updates: planned.map((t) => ({
                        id: t.id,
                        assignedSlot: t.assignedSlot,
                    })),
                }),
            });
            if (!res.ok) {
                setTasks(previousTasks);
                showToast("Failed to save generated schedule.", "error");
            } else {
                showToast("Weekly timetable generated.", "success");
            }
        } catch {
            setTasks(previousTasks);
            showToast("Network error saving generated schedule.", "error");
        }
    };

    const calendarEvents = useMemo(
        () => buildCalendarEvents(fixedEvents, tasks, repeatWeeks),
        [fixedEvents, tasks, repeatWeeks]
    );

    const onEventDrop = async ({
        event,
        start,
    }: EventInteractionArgs<SchedulerCalendarEvent>) => {
        if (event.isFixed || !event.taskId) return;

        const targetTask = tasks.find((t) => t.id === event.taskId);
        if (!targetTask) return;

        const dropDate = start instanceof Date ? start : new Date(start);
        const startHours = dropDate.getHours() + dropDate.getMinutes() / 60;
        if (startHours < 0 || startHours + targetTask.duration > 24) {
            showToast("Task must remain within the same day (00:00 - 24:00).", "error");
            return;
        }

        const newDay = JS_WEEKDAYS[dropDate.getDay()];
        const newStartTime = floatToTime(startHours);

        if (
            checkSlotCollision(
                newDay,
                startHours,
                targetTask.duration,
                fixedEvents,
                tasks,
                targetTask.id
            )
        ) {
            showToast("Cannot move task here — it overlaps another event or buffer.", "error");
            return;
        }

        const previousSlot: AssignedSlot | undefined = targetTask.assignedSlot;
        setTasks((prev) =>
            prev.map((t) =>
                t.id === targetTask.id
                    ? { ...t, assignedSlot: { day: newDay, startTime: newStartTime } }
                    : t
            )
        );

        try {
            const res = await fetch(
                `/api/scheduler/tasks/${encodeURIComponent(targetTask.id)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        scheduledDay: newDay,
                        scheduledStartTime: newStartTime,
                    }),
                }
            );
            if (!res.ok) {
                throw new Error("PATCH failed");
            }
        } catch {
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === targetTask.id ? { ...t, assignedSlot: previousSlot } : t
                )
            );
            showToast("Could not save new task position.", "error");
        }
    };

    const onSelectEvent = async (event: SchedulerCalendarEvent) => {
        const confirmed = await confirmAction({
            title: `Remove "${event.title}"?`,
            description: event.isFixed
                ? "This recurring fixed commitment will be deleted."
                : "This scheduled task will be deleted.",
            confirmLabel: "Remove",
            cancelLabel: "Keep",
            destructive: true,
        });
        if (!confirmed) return;

        if (event.isFixed) {
            await removeFixed(event.resourceId);
        } else {
            const taskToDelete = tasks.find((t) => t.id === event.taskId);
            if (taskToDelete) {
                await removeTask(taskToDelete);
            }
        }
    };

    const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
        const h = start.getHours().toString().padStart(2, "0");
        const m = start.getMinutes().toString().padStart(2, "0");
        const eh = end.getHours().toString().padStart(2, "0");
        const em = end.getMinutes().toString().padStart(2, "0");
        const day = JS_WEEKDAYS[start.getDay()];

        setNewEvent((prev) => ({
            ...prev,
            day,
            startTime: `${h}:${m}`,
            endTime: `${eh}:${em}`,
        }));

        const formElement = document.getElementById("fixed-schedule-form");
        if (formElement) {
            formElement.scrollIntoView({ behavior: "smooth" });
        }
    };

    const everydayTaskGroups = useMemo(() => {
        const map = new Map<string, SchedulerTaskDTO & { daysCount: number }>();
        for (const task of tasks) {
            if (!task.groupId) continue;
            const existing = map.get(task.groupId);
            if (!existing) {
                map.set(task.groupId, { ...task, daysCount: 1 });
            } else {
                existing.daysCount += 1;
            }
        }
        return Array.from(map.values());
    }, [tasks]);

    const normalTasks = useMemo(() => tasks.filter((t) => !t.groupId), [tasks]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background w-full">
                <p className="text-muted-foreground animate-pulse">Loading schedule...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 bg-background flex flex-col items-center">
            <div className="w-full max-w-6xl space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Smart Scheduler</h1>
                        <p className="text-muted-foreground">
                            Auto-generate your balanced study week around fixed commitments.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                            <span className="text-muted-foreground mr-2 font-medium">
                                Loop Weeks:
                            </span>
                            <input
                                type="number"
                                aria-label="Repeat timetable for weeks"
                                min={1}
                                max={52}
                                className="w-12 bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-center text-foreground font-semibold"
                                value={repeatWeeks}
                                onChange={(e) =>
                                    setRepeatWeeks(
                                        Math.max(1, Math.min(52, parseInt(e.target.value, 10) || 1))
                                    )
                                }
                            />
                        </label>
                        <Button type="button" variant="outline" onClick={() => void handleResetAll()}>
                            <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" /> Reset
                        </Button>
                        <Button
                            type="button"
                            className="bg-primary"
                            onClick={() => void generateSchedule()}
                        >
                            <Calendar className="w-4 h-4 mr-2" aria-hidden="true" /> Generate
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-6 lg:col-span-1">
                        <Card className="glass-card" id="fixed-schedule-form">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">1. Fixed Schedule</CardTitle>
                                <CardDescription>Classes, part-time jobs, etc.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fixed-event-name">Activity Name</Label>
                                    <Input
                                        id="fixed-event-name"
                                        placeholder="e.g. Calculus Class"
                                        value={newEvent.name}
                                        onChange={(e) =>
                                            setNewEvent({ ...newEvent, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="fixed-event-day">Day</Label>
                                        <select
                                            id="fixed-event-day"
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={newEvent.day}
                                            onChange={(e) =>
                                                setNewEvent({
                                                    ...newEvent,
                                                    day: e.target.value as WeekdayName,
                                                })
                                            }
                                        >
                                            {DAYS_ORDER.map((d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Time</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                aria-label="Fixed event start time"
                                                type="time"
                                                className="flex-1 min-w-0 text-sm h-10 px-2"
                                                value={newEvent.startTime}
                                                onChange={(e) =>
                                                    setNewEvent({
                                                        ...newEvent,
                                                        startTime: e.target.value,
                                                    })
                                                }
                                            />
                                            <span className="text-muted-foreground flex-shrink-0">
                                                –
                                            </span>
                                            <Input
                                                aria-label="Fixed event end time"
                                                type="time"
                                                className="flex-1 min-w-0 text-sm h-10 px-2"
                                                value={newEvent.endTime}
                                                onChange={(e) =>
                                                    setNewEvent({
                                                        ...newEvent,
                                                        endTime: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    className="w-full"
                                    variant="secondary"
                                    onClick={() => void addFixedEvent()}
                                    disabled={!newEvent.name.trim()}
                                >
                                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add Fixed
                                    Event
                                </Button>

                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                    {fixedEvents.map((ev) => (
                                        <div
                                            key={ev.id}
                                            className="flex justify-between items-center text-sm p-2 bg-secondary/10 rounded-md border border-secondary/20"
                                        >
                                            <div>
                                                <span className="font-semibold block">
                                                    {ev.name}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {ev.day.slice(0, 3)} {ev.startTime}-{ev.endTime}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void removeFixed(ev.id)}
                                                aria-label={`Remove fixed event ${ev.name}`}
                                                className="text-muted-foreground hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}
                                    {fixedEvents.length === 0 && (
                                        <p className="text-xs text-center text-muted-foreground py-2">
                                            No fixed events yet.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">2. Task To Do Everyday</CardTitle>
                                <CardDescription>
                                    Schedules a recurring daily block across your week.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="everyday-task-name">Everyday Task Name</Label>
                                    <Input
                                        id="everyday-task-name"
                                        placeholder="e.g. Morning Jog"
                                        value={everydayTask.name}
                                        onChange={(e) =>
                                            setEverydayTask({
                                                ...everydayTask,
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Hours)</Label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map((h) => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() =>
                                                    setEverydayTask({
                                                        ...everydayTask,
                                                        duration: h,
                                                    })
                                                }
                                                className={cn(
                                                    "flex-1 py-2 rounded-md border text-sm transition-all",
                                                    everydayTask.duration === h
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-transparent hover:bg-muted"
                                                )}
                                            >
                                                {h}h
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="weekends"
                                        checked={includeWeekends}
                                        onChange={(e) => setIncludeWeekends(e.target.checked)}
                                        className="rounded border-input bg-background w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    <Label
                                        htmlFor="weekends"
                                        className="text-sm font-normal cursor-pointer text-muted-foreground"
                                    >
                                        Include Weekends (Sat-Sun)
                                    </Label>
                                </div>
                                <Button
                                    type="button"
                                    className="w-full"
                                    variant="secondary"
                                    onClick={() => void addEverydayTask()}
                                    disabled={!everydayTask.name.trim()}
                                >
                                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add
                                    Everyday Task
                                </Button>

                                {everydayTaskGroups.length > 0 && (
                                    <div className="space-y-2 pt-3 border-t border-border">
                                        <Label className="text-xs text-muted-foreground block">
                                            Added Everyday Tasks
                                        </Label>
                                        {everydayTaskGroups.map((groupTask) => (
                                            <div
                                                key={groupTask.groupId}
                                                className="flex justify-between items-center text-sm p-2 bg-primary/10 rounded-md border border-primary/20"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-semibold text-primary truncate">
                                                        {groupTask.name}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] shrink-0">
                                                        {groupTask.duration}h ·{" "}
                                                        {groupTask.daysCount}d/wk
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void removeTask(groupTask)}
                                                    aria-label={`Remove recurring task ${groupTask.name}`}
                                                    className="text-muted-foreground hover:text-red-500 shrink-0"
                                                >
                                                    <Trash2
                                                        className="w-4 h-4"
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">3. Tasks To Do</CardTitle>
                                <CardDescription>Flexible items to fit in once.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="normal-task-name">Task Name</Label>
                                    <Input
                                        id="normal-task-name"
                                        placeholder="e.g. Study Math"
                                        value={normalTask.name}
                                        onChange={(e) =>
                                            setNormalTask({ ...normalTask, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Hours)</Label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4].map((h) => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() =>
                                                    setNormalTask({ ...normalTask, duration: h })
                                                }
                                                className={cn(
                                                    "flex-1 py-2 rounded-md border text-sm transition-all",
                                                    normalTask.duration === h
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-transparent hover:bg-muted"
                                                )}
                                            >
                                                {h}h
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    className="w-full"
                                    variant="secondary"
                                    onClick={() => void addNormalTask()}
                                    disabled={!normalTask.name.trim()}
                                >
                                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add Task
                                </Button>

                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 border-t border-border pt-3">
                                    <Label className="text-xs text-muted-foreground mb-2 block">
                                        Individual Tasks
                                    </Label>
                                    {normalTasks.map((t) => (
                                        <div
                                            key={t.id}
                                            className={cn(
                                                "flex justify-between items-center text-sm p-2 rounded-md border",
                                                t.assignedSlot
                                                    ? "bg-secondary/10 border-secondary/20"
                                                    : "bg-red-500/10 border-red-500/20"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-center">
                                                    <span className="font-semibold">{t.name}</span>
                                                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                                                        {t.duration}h
                                                    </span>
                                                </div>
                                                {!t.assignedSlot && (
                                                    <span className="text-[10px] text-red-400">
                                                        Not scheduled (no space)
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void removeTask(t)}
                                                aria-label={`Remove task ${t.name}`}
                                                className="text-muted-foreground hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}
                                    {normalTasks.length === 0 && (
                                        <p className="text-xs text-center text-muted-foreground py-2">
                                            No individual tasks added.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card className="glass-card h-full min-h-[600px] flex flex-col">
                            <CardHeader className="pb-4 space-y-3">
                                <div>
                                    <CardTitle>Weekly Timetable</CardTitle>
                                    <CardDescription className="mt-1">
                                        {generated
                                            ? "Here is your optimized schedule. Drag and drop tasks to adjust, or click any block to remove it."
                                            : "Add events and click Generate to build your plan."}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 bg-secondary/20 p-2.5 rounded-md border text-sm">
                                    <div className="font-semibold text-primary">
                                        Auto-Schedule Allowed Hours:
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            aria-label="Allowed schedule start time"
                                            type="time"
                                            value={allowedStartTime}
                                            onChange={(e) => setAllowedStartTime(e.target.value)}
                                            className="h-8 w-28 px-2"
                                        />
                                        <span className="text-muted-foreground">to</span>
                                        <Input
                                            aria-label="Allowed schedule end time"
                                            type="time"
                                            value={allowedEndTime}
                                            onChange={(e) => setAllowedEndTime(e.target.value)}
                                            className="h-8 w-28 px-2"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-x-auto p-0 md:p-6 pb-6">
                                <div className="h-[900px] w-full min-w-[600px] rounded-md overflow-hidden bg-background">
                                    <DnDCalendar
                                        localizer={localizer}
                                        events={calendarEvents}
                                        defaultView="week"
                                        views={["week", "day"]}
                                        step={15}
                                        timeslots={4}
                                        onEventDrop={(args) => void onEventDrop(args)}
                                        resizable={false}
                                        draggableAccessor={(event) => !event.isFixed}
                                        onSelectEvent={(event) => void onSelectEvent(event)}
                                        onSelectSlot={onSelectSlot}
                                        selectable
                                        components={{
                                            event: CustomCalendarEvent,
                                        }}
                                        eventPropGetter={(event) => ({
                                            style: {
                                                backgroundColor: event.isFixed
                                                    ? "#f43f5e"
                                                    : "#3b82f6",
                                                color: "white",
                                                borderRadius: "6px",
                                                border: "1px solid rgba(255,255,255,0.2)",
                                                padding: "2px 4px",
                                            },
                                        })}
                                        toolbar
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
