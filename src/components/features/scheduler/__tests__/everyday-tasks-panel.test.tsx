import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    EverydayTasksPanel,
    type EverydayTaskGroup,
    type TaskDraft,
} from "@/components/features/scheduler/everyday-tasks-panel";
import type { SchedulerTaskDTO } from "@/types";

function EverydayHarness({
    groups,
    onAdd,
    onRemoveGroup,
}: {
    groups: EverydayTaskGroup[];
    onAdd: (draft: TaskDraft, weekends: boolean) => void;
    onRemoveGroup: (task: SchedulerTaskDTO) => void;
}) {
    const [task, setTask] = useState<TaskDraft>({ name: "", duration: 1 });
    const [includeWeekends, setIncludeWeekends] = useState(true);

    return (
        <EverydayTasksPanel
            everydayTask={task}
            onChangeEverydayTask={setTask}
            includeWeekends={includeWeekends}
            onChangeIncludeWeekends={setIncludeWeekends}
            everydayTaskGroups={groups}
            onAdd={() => onAdd(task, includeWeekends)}
            onRemoveGroup={onRemoveGroup}
        />
    );
}

describe("features/scheduler/EverydayTasksPanel", () => {
    it("updates duration preset, weekend toggle, submits, and removes recurring task groups", () => {
        const onAdd = vi.fn();
        const onRemoveGroup = vi.fn();
        const existingGroup: EverydayTaskGroup = {
            id: "t1",
            name: "Reading",
            duration: 1,
            groupId: "g1",
            daysCount: 5,
        };

        render(
            <EverydayHarness
                groups={[existingGroup]}
                onAdd={onAdd}
                onRemoveGroup={onRemoveGroup}
            />
        );

        expect(screen.getByText("1h · 5d/wk")).toBeInTheDocument();

        const btn2h = screen.getByRole("button", { name: "2h" });
        fireEvent.click(btn2h);
        expect(btn2h).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(screen.getByLabelText(/Include Weekends/i));
        fireEvent.change(screen.getByLabelText("Everyday Task Name"), {
            target: { value: "Anki Review" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Add Everyday Task/i }));

        expect(onAdd).toHaveBeenCalledWith({ name: "Anki Review", duration: 2 }, false);

        fireEvent.click(screen.getByRole("button", { name: "Remove recurring task Reading" }));
        expect(onRemoveGroup).toHaveBeenCalledWith(existingGroup);
    });
});
