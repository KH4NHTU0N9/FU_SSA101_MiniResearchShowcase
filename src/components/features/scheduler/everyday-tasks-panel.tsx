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
import { cn } from "@/lib/utils";
import type { SchedulerTaskDTO } from "@/types";

export interface TaskDraft {
    name: string;
    duration: number;
}

export interface EverydayTaskGroup extends SchedulerTaskDTO {
    daysCount: number;
}

export interface EverydayTasksPanelProps {
    everydayTask: TaskDraft;
    onChangeEverydayTask: Dispatch<SetStateAction<TaskDraft>>;
    includeWeekends: boolean;
    onChangeIncludeWeekends: (val: boolean) => void;
    everydayTaskGroups: EverydayTaskGroup[];
    onAdd: () => void;
    onRemoveGroup: (task: SchedulerTaskDTO) => void;
}

/**
 * Form and grouped list panel for scheduling recurring daily blocks (weekdays or full week).
 */
export function EverydayTasksPanel({
    everydayTask,
    onChangeEverydayTask,
    includeWeekends,
    onChangeIncludeWeekends,
    everydayTaskGroups,
    onAdd,
    onRemoveGroup,
}: EverydayTasksPanelProps) {
    return (
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
                            onChangeEverydayTask((prev) => ({ ...prev, name: e.target.value }))
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
                                aria-pressed={everydayTask.duration === h}
                                onClick={() =>
                                    onChangeEverydayTask((prev) => ({ ...prev, duration: h }))
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
                        onChange={(e) => onChangeIncludeWeekends(e.target.checked)}
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
                    onClick={onAdd}
                    disabled={!everydayTask.name.trim()}
                >
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add Everyday Task
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
                                        {groupTask.duration}h · {groupTask.daysCount}d/wk
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveGroup(groupTask)}
                                    aria-label={`Remove recurring task ${groupTask.name}`}
                                    className="text-muted-foreground hover:text-red-500 shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
