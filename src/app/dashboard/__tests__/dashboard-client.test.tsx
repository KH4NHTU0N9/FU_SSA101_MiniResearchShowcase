import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardClient from "@/app/dashboard/dashboard-client";
import { LanguageProvider } from "@/lib/language-context";

const { showToastMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({ showToast: showToastMock }),
}));

vi.mock("@/app/dashboard/mood-trend-chart", () => ({
    default: ({ onAddCheckIn }: { onAddCheckIn: () => void }) => (
        <button type="button" onClick={onAddCheckIn}>
            Mock Chart Add
        </button>
    ),
}));

const sampleUser = {
    id: "u1",
    name: "An Nguyen",
    email: "an@fpt.edu.vn",
    phone: null,
    createdAt: "2026-03-01T00:00:00.000Z",
};

describe("app/dashboard/DashboardClient", () => {
    beforeEach(() => {
        localStorage.clear();
        showToastMock.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("renders high-risk alert banner and assessment CTA when no assessment exists", () => {
        render(
            <LanguageProvider>
                <DashboardClient
                    user={sampleUser}
                    initialHistory={[
                        {
                            id: "m1",
                            mood: 1,
                            focus: 1,
                            energy: 20,
                            emotion: "anxious",
                            createdAt: "2026-03-01T08:00:00.000Z",
                            date: "Sun",
                        },
                    ]}
                    assessmentData={null}
                />
            </LanguageProvider>
        );

        expect(screen.getByText(/We noticed you've been feeling down lately/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Call Hotline/i })).toHaveAttribute("href", "tel:111");
        expect(screen.getByText("Complete your Assessment")).toBeInTheDocument();
    });

    it("validates emotion selection, submits daily check-in, and exports mental-health map JSON", async () => {
        const fetchMock = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    id: "m2",
                    mood: 5,
                    focus: 5,
                    energy: 80,
                    emotion: "excited",
                    createdAt: "2026-03-02T08:00:00.000Z",
                }),
                { status: 201 }
            )
        );
        vi.stubGlobal("fetch", fetchMock);

        const createObjectUrlSpy = vi.fn(() => "blob:mock-export");
        const revokeObjectUrlSpy = vi.fn();
        vi.stubGlobal("URL", {
            ...URL,
            createObjectURL: createObjectUrlSpy,
            revokeObjectURL: revokeObjectUrlSpy,
        });
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        render(
            <LanguageProvider>
                <DashboardClient
                    user={sampleUser}
                    initialHistory={[]}
                    assessmentData={{
                        id: "a1",
                        createdAt: "2026-03-01T00:00:00.000Z",
                        scores: { Depression: 3, Anxiety: 2, Stress: 4 },
                    }}
                />
            </LanguageProvider>
        );

        fireEvent.click(screen.getByRole("button", { name: /^Check-in$/i }));
        fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));
        expect(showToastMock).toHaveBeenCalledWith("Please select how you feel before saving.", "error");
        expect(fetchMock).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText(/Energy Level/i), { target: { value: "80" } });
        fireEvent.click(screen.getByRole("button", { name: /Energized/i }));
        fireEvent.click(screen.getByRole("button", { name: "Save Check-in" }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith("/api/mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mood: 5,
                    energy: 80,
                    emotion: "excited",
                    focus: 5,
                }),
            });
            expect(showToastMock).toHaveBeenCalledWith("Daily check-in saved!", "success");
        });

        fireEvent.click(screen.getByRole("button", { name: /Export Map/i }));
        expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:mock-export");
        expect(showToastMock).toHaveBeenCalledWith("Mental health map exported as JSON.", "success");
    });
});
