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
import type { TaskDraft } from "./everyday-tasks-panel";

export interface IndividualTasksPanelProps {
    normalTask: TaskDraft;
    onChangeNormalTask: Dispatch<SetStateAction<TaskDraft>>;
    normalTasks: SchedulerTaskDTO[];
    onAdd: () => void;
    onRemoveTask: (task: SchedulerTaskDTO) => void;
}

/**
 * Form and task list panel for scheduling flexible one-off study tasks.
 */
export function IndividualTasksPanel({
    normalTask,
    onChangeNormalTask,
    normalTasks,
    onAdd,
    onRemoveTask,
}: IndividualTasksPanelProps) {
    return (
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
                            onChangeNormalTask((prev) => ({ ...prev, name: e.target.value }))
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
                                aria-pressed={normalTask.duration === h}
                                onClick={() =>
                                    onChangeNormalTask((prev) => ({ ...prev, duration: h }))
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
                    onClick={onAdd}
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
                                onClick={() => onRemoveTask(t)}
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
    );
}
