import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndividualTasksPanel } from "@/components/features/scheduler/individual-tasks-panel";
import type { TaskDraft } from "@/components/features/scheduler/everyday-tasks-panel";
import type { SchedulerTaskDTO } from "@/types";

function IndividualHarness({
    tasks,
    onAdd,
    onRemoveTask,
}: {
    tasks: SchedulerTaskDTO[];
    onAdd: (draft: TaskDraft) => void;
    onRemoveTask: (task: SchedulerTaskDTO) => void;
}) {
    const [task, setTask] = useState<TaskDraft>({ name: "", duration: 1 });
    return (
        <IndividualTasksPanel
            normalTask={task}
            onChangeNormalTask={setTask}
            normalTasks={tasks}
            onAdd={() => onAdd(task)}
            onRemoveTask={onRemoveTask}
        />
    );
}

describe("features/scheduler/IndividualTasksPanel", () => {
    it("highlights unscheduled tasks, handles duration selection, and invokes add/remove", () => {
        const onAdd = vi.fn();
        const onRemoveTask = vi.fn();
        const tasks: SchedulerTaskDTO[] = [
            {
                id: "t1",
                name: "Linear Algebra HW",
                duration: 2,
                assignedSlot: { day: "Monday", startTime: "10:00" },
            },
            {
                id: "t2",
                name: "Overflow Task",
                duration: 4,
            },
        ];

        render(<IndividualHarness tasks={tasks} onAdd={onAdd} onRemoveTask={onRemoveTask} />);

        expect(screen.getByText("Linear Algebra HW")).toBeInTheDocument();
        expect(screen.getByText("Not scheduled (no space)")).toBeInTheDocument();

        const btn4h = screen.getByRole("button", { name: "4h" });
        fireEvent.click(btn4h);
        expect(btn4h).toHaveAttribute("aria-pressed", "true");

        fireEvent.change(screen.getByLabelText("Task Name"), { target: { value: "Essay Draft" } });
        fireEvent.click(screen.getByRole("button", { name: /Add Task/i }));
        expect(onAdd).toHaveBeenCalledWith({ name: "Essay Draft", duration: 4 });

        fireEvent.click(screen.getByRole("button", { name: "Remove task Overflow Task" }));
        expect(onRemoveTask).toHaveBeenCalledWith(tasks[1]);
    });
});
