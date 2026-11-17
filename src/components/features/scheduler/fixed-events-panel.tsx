"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { DAYS_ORDER } from "@/lib/scheduler/algorithm";
import type { FixedEventDTO, WeekdayName } from "@/types";

export interface FixedEventDraft {
    name: string;
    day: WeekdayName;
    startTime: string;
    endTime: string;
}

export interface FixedEventsPanelProps {
    fixedEvents: FixedEventDTO[];
    newEvent: FixedEventDraft;
    onChangeNewEvent: Dispatch<SetStateAction<FixedEventDraft>>;
    onAdd: () => void;
    onRemove: (id: string) => void;
}

/**
 * Form and list panel for managing recurring fixed weekly commitments (classes, shifts).
 */
export function FixedEventsPanel({
    fixedEvents,
    newEvent,
    onChangeNewEvent,
    onAdd,
    onRemove,
}: FixedEventsPanelProps) {
    return (
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
                            onChangeNewEvent((prev) => ({ ...prev, name: e.target.value }))
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
                                onChangeNewEvent((prev) => ({
                                    ...prev,
                                    day: e.target.value as WeekdayName,
                                }))
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
                                    onChangeNewEvent((prev) => ({
                                        ...prev,
                                        startTime: e.target.value,
                                    }))
                                }
                            />
                            <span className="text-muted-foreground flex-shrink-0">–</span>
                            <Input
                                aria-label="Fixed event end time"
                                type="time"
                                className="flex-1 min-w-0 text-sm h-10 px-2"
                                value={newEvent.endTime}
                                onChange={(e) =>
                                    onChangeNewEvent((prev) => ({
                                        ...prev,
                                        endTime: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </div>
                <Button
                    type="button"
                    className="w-full"
                    variant="secondary"
                    onClick={onAdd}
                    disabled={!newEvent.name.trim()}
                >
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add Fixed Event
                </Button>

                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                    {fixedEvents.map((ev) => (
                        <div
                            key={ev.id}
                            className="flex justify-between items-center text-sm p-2 bg-secondary/10 rounded-md border border-secondary/20"
                        >
                            <div>
                                <span className="font-semibold block">{ev.name}</span>
                                <span className="text-muted-foreground">
                                    {ev.day.slice(0, 3)} {ev.startTime}-{ev.endTime}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(ev.id)}
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
    );
}
