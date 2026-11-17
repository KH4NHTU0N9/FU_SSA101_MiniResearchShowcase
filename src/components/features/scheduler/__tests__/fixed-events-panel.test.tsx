import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    FixedEventsPanel,
    type FixedEventDraft,
} from "@/components/features/scheduler/fixed-events-panel";
import type { FixedEventDTO } from "@/types";

function FixedPanelHarness({
    events,
    onAdd,
    onRemove,
}: {
    events: FixedEventDTO[];
    onAdd: (draft: FixedEventDraft) => void;
    onRemove: (id: string) => void;
}) {
    const [draft, setDraft] = useState<FixedEventDraft>({
        name: "",
        day: "Monday",
        startTime: "08:00",
        endTime: "10:00",
    });

    return (
        <FixedEventsPanel
            fixedEvents={events}
            newEvent={draft}
            onChangeNewEvent={setDraft}
            onAdd={() => onAdd(draft)}
            onRemove={onRemove}
        />
    );
}

describe("features/scheduler/FixedEventsPanel", () => {
    it("renders existing fixed events, toggles add button on input, and invokes remove", () => {
        const onAdd = vi.fn();
        const onRemove = vi.fn();

        render(
            <FixedPanelHarness
                events={[
                    {
                        id: "fe1",
                        name: "MAD101 Lecture",
                        day: "Tuesday",
                        startTime: "07:30",
                        endTime: "09:45",
                    },
                ]}
                onAdd={onAdd}
                onRemove={onRemove}
            />
        );

        expect(screen.getByText("MAD101 Lecture")).toBeInTheDocument();
        expect(screen.getByText("Tue 07:30-09:45")).toBeInTheDocument();

        const addBtn = screen.getByRole("button", { name: /Add Fixed Event/i });
        expect(addBtn).toBeDisabled();

        fireEvent.change(screen.getByLabelText("Activity Name"), {
            target: { value: "Lab Session" },
        });
        fireEvent.change(screen.getByLabelText("Day"), { target: { value: "Friday" } });
        expect(addBtn).toBeEnabled();

        fireEvent.click(addBtn);
        expect(onAdd).toHaveBeenCalledWith({
            name: "Lab Session",
            day: "Friday",
            startTime: "08:00",
            endTime: "10:00",
        });

        fireEvent.click(screen.getByRole("button", { name: "Remove fixed event MAD101 Lecture" }));
        expect(onRemove).toHaveBeenCalledWith("fe1");
    });

    it("renders empty placeholder when no fixed events exist", () => {
        render(
            <FixedPanelHarness events={[]} onAdd={vi.fn()} onRemove={vi.fn()} />
        );
        expect(screen.getByText("No fixed events yet.")).toBeInTheDocument();
    });
});
