import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExamMaterialsPage from "@/app/exam-materials/page";

const { showToastMock, confirmActionMock, searchParamsMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
    confirmActionMock: vi.fn(),
    searchParamsMock: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => searchParamsMock.current,
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

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        user: { id: "u1", name: "An Nguyen", email: "an@fpt.edu.vn", phone: null },
    }),
}));

vi.mock("@vercel/blob/client", () => ({
    upload: vi.fn(),
}));

const sampleMaterial = {
    id: "mat-1",
    title: "SWP391 Study Guide",
    description: "Summary slides",
    type: "DOCX",
    size: 1500,
    totalDownloads: 2,
    createdAt: "2026-03-01T00:00:00.000Z",
    semester: { id: "sem1", name: "Spring 2026" },
    subject: { id: "sub1", code: "SWP391", name: "Capstone" },
    uploadedBy: { id: "u1", name: "An Nguyen" },
};

describe("app/exam-materials", () => {
    beforeEach(() => {
        showToastMock.mockReset();
        confirmActionMock.mockReset();
        searchParamsMock.current = new URLSearchParams();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("loads materials catalog, opens deep-linked share preview, and deletes owner material", async () => {
        searchParamsMock.current = new URLSearchParams("material=mat-1");
        confirmActionMock.mockResolvedValue(true);

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.startsWith("/api/exam-materials/filters")) {
                return new Response(
                    JSON.stringify([
                        {
                            id: "sem1",
                            name: "Spring 2026",
                            subjects: [{ id: "sub1", code: "SWP391", name: "Capstone" }],
                        },
                    ]),
                    { status: 200 }
                );
            }
            if (url.startsWith("/api/exam-materials?") || url === "/api/exam-materials") {
                return new Response(
                    JSON.stringify({ materials: [sampleMaterial], total: 1 }),
                    { status: 200 }
                );
            }
            if (url.startsWith("/api/exam-materials/mat-1") && init?.method === "DELETE") {
                return new Response(JSON.stringify({ ok: true }), { status: 200 });
            }
            return new Response("{}", { status: 404 });
        });
        vi.stubGlobal("fetch", fetchMock);

        render(<ExamMaterialsPage />);

        expect(await screen.findByText("1 material found")).toBeInTheDocument();
        expect(await screen.findByRole("dialog")).toHaveTextContent("SWP391 Study Guide");

        fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Delete SWP391 Study Guide" }));

        await waitFor(() => {
            expect(confirmActionMock).toHaveBeenCalledTimes(1);
            expect(screen.queryByText("SWP391 Study Guide")).not.toBeInTheDocument();
            expect(showToastMock).toHaveBeenCalledWith("Material deleted.", "success");
        });
    });
});
