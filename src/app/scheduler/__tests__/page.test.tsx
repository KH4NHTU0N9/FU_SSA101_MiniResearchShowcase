import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SchedulerPage from "@/app/scheduler/page";
import type { SchedulerCalendarEvent } from "@/types";

const { showToastMock, confirmActionMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
    confirmActionMock: vi.fn(),
}));

vi.mock("@/components/layout/protected-route", () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({
        showToast: showToastMock,
        confirmAction: confirmActionMock,
    }),
}));

vi.mock("react-big-calendar", () => ({
    Calendar: () => null,
    dateFnsLocalizer: () => ({}),
}));

vi.mock("react-big-calendar/lib/addons/dragAndDrop", () => ({
    default:
        () =>
        ({
            events,
            onSelectEvent,
        }: {
            events: SchedulerCalendarEvent[];
            onSelectEvent: (ev: SchedulerCalendarEvent) => void;
        }) => (
            <div data-testid="mock-calendar">
                {events.map((ev) => (
                    <button key={ev.id} type="button" onClick={() => onSelectEvent(ev)}>
                        {ev.title}
                    </button>
                ))}
            </div>
        ),
}));

vi.mock("react-big-calendar/lib/css/react-big-calendar.css", () => ({}));
vi.mock("react-big-calendar/lib/addons/dragAndDrop/styles.css", () => ({}));

describe("app/scheduler", () => {
    beforeEach(() => {
        showToastMock.mockReset();
        confirmActionMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("loads saved schedule, adds fixed event, generates plan, and resets all", async () => {
        confirmActionMock.mockResolvedValue(true);
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === "/api/scheduler" && (!init?.method || init.method === "GET")) {
                return new Response(
                    JSON.stringify({
                        fixedEvents: [],
                        tasks: [
                            {
                                id: "task-1",
                                name: "Study Physics",
                                duration: 2,
                            },
                        ],
                    }),
                    { status: 200 }
                );
            }
            if (url === "/api/scheduler/fixed" && init?.method === "POST") {
                return new Response(
                    JSON.stringify({
                        id: "fe-1",
                        name: "DSA Class",
                        day: "Monday",
                        startTime: "08:00",
                        endTime: "10:00",
                    }),
                    { status: 201 }
                );
            }
            if (url === "/api/scheduler/tasks/batch" && init?.method === "PUT") {
                return new Response(JSON.stringify({ updated: 1 }), { status: 200 });
            }
            if (url === "/api/scheduler" && init?.method === "DELETE") {
                return new Response(JSON.stringify({ cleared: true }), { status: 200 });
            }
            return new Response("{}", { status: 404 });
        });
        vi.stubGlobal("fetch", fetchMock);

        render(<SchedulerPage />);

        expect(await screen.findByText("Smart Scheduler")).toBeInTheDocument();
        expect(screen.getByText("Study Physics")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Activity Name"), {
            target: { value: "DSA Class" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Add Fixed Event/i }));

        await waitFor(() => {
            expect(showToastMock).toHaveBeenCalledWith("Fixed event added.", "success");
        });

        fireEvent.click(screen.getByRole("button", { name: /Generate/i }));
        await waitFor(() => {
            expect(showToastMock).toHaveBeenCalledWith("Weekly timetable generated.", "success");
        });

        fireEvent.click(screen.getByRole("button", { name: /Reset/i }));
        await waitFor(() => {
            expect(confirmActionMock).toHaveBeenCalledTimes(1);
            expect(showToastMock).toHaveBeenCalledWith("Schedule cleared.", "info");
        });
    });
});
