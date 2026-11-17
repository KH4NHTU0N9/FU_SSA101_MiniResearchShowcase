import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatPage from "@/app/chat/page";

const { showToastMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
}));

vi.mock("@/components/layout/protected-route", () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/features/professional-help-modal", () => ({
    ProfessionalHelpModal: ({ open, reason }: { open: boolean; reason?: string }) =>
        open ? <div data-testid="help-modal" data-reason={reason} /> : null,
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({ showToast: showToastMock }),
}));

describe("app/chat", () => {
    beforeEach(() => {
        showToastMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("loads saved history, streams bot response chunks, and opens crisis modal on risk keywords", async () => {
        const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            if (!init?.method || init.method === "GET") {
                return new Response(
                    JSON.stringify({
                        messages: [
                            {
                                id: "h1",
                                role: "user",
                                text: "Earlier check-in",
                                timestamp: "2026-03-01T10:00:00.000Z",
                                type: "normal",
                            },
                        ],
                    }),
                    { status: 200 }
                );
            }
            if (init.method === "POST") {
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode("Help is available right away."));
                        controller.close();
                    },
                });
                return new Response(stream, { status: 200 });
            }
            if (init.method === "DELETE") {
                return new Response(JSON.stringify({ cleared: true }), { status: 200 });
            }
            return new Response("{}", { status: 404 });
        });
        vi.stubGlobal("fetch", fetchMock);

        render(<ChatPage />);

        expect(await screen.findByText("Earlier check-in")).toBeInTheDocument();

        const input = screen.getByLabelText("Chat message");
        fireEvent.change(input, { target: { value: "I feel like suicide" } });
        fireEvent.click(screen.getByRole("button", { name: "Send message" }));

        expect(await screen.findByTestId("help-modal")).toHaveAttribute("data-reason", "chat");
        expect(await screen.findByText("Help is available right away.")).toBeInTheDocument();
        expect(screen.getByText(/Hotline: 111/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Clear chat history" }));
        await waitFor(() => {
            expect(screen.getByText(/Chat history cleared/i)).toBeInTheDocument();
        });
    });
});
