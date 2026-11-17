import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { redirectMock, getSessionMock } = vi.hoisted(() => ({
    redirectMock: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    getSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: redirectMock,
}));

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
    prisma: prismaMock,
}));

vi.mock("@/app/dashboard/dashboard-client", () => ({
    default: ({
        user,
        initialHistory,
        assessmentData,
    }: {
        user: { name: string | null };
        initialHistory: unknown[];
        assessmentData: unknown;
    }) => (
        <div
            data-testid="dashboard-client"
            data-name={user.name}
            data-history={initialHistory.length}
            data-has-assessment={Boolean(assessmentData)}
        />
    ),
}));

import DashboardPage from "@/app/dashboard/page";

describe("app/dashboard SSR page", () => {
    beforeEach(() => {
        resetPrismaMocks();
        redirectMock.mockClear();
        getSessionMock.mockReset();
    });

    it("redirects to /login when session or matching tokenVersion is absent", async () => {
        getSessionMock.mockResolvedValue(null);
        await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/login");

        getSessionMock.mockResolvedValue({ user: { id: "u1", tokenVersion: 2 } });
        prismaMock.user.findUnique.mockResolvedValue({
            id: "u1",
            name: "An",
            email: "an@fpt.edu.vn",
            tokenVersion: 1,
        } as never);
        await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("hydrates latest DASS-21 scores and recent mood logs for valid user", async () => {
        getSessionMock.mockResolvedValue({ user: { id: "u1", tokenVersion: 1 } });
        prismaMock.user.findUnique.mockResolvedValue({
            id: "u1",
            name: "An Nguyen",
            email: "an@fpt.edu.vn",
            tokenVersion: 1,
        } as never);
        prismaMock.assessment.findFirst.mockResolvedValue({
            id: "a1",
            depressionScore: 4,
            anxietyScore: 3,
            stressScore: 6,
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
        } as never);
        prismaMock.moodLog.findMany.mockResolvedValue([
            {
                id: "m1",
                mood: 4,
                focus: 5,
                energy: 80,
                emotion: "excited",
                createdAt: new Date("2026-03-02T10:00:00.000Z"),
            },
        ] as never);

        const tree = await DashboardPage();
        render(tree);

        const el = screen.getByTestId("dashboard-client");
        expect(el).toHaveAttribute("data-name", "An Nguyen");
        expect(el).toHaveAttribute("data-history", "1");
        expect(el).toHaveAttribute("data-has-assessment", "true");
    });
});
