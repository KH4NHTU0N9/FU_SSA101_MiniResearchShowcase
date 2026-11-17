import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

import { POST } from "@/app/api/chat/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/chat — SSE streaming & DB persistence", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        vi.stubEnv("CHAT_API_KEY", "test-chat-secret");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("streams parsed SSE delta chunks and saves complete assistant reply in PostgreSQL", async () => {
        const user = createMockUser({ id: "u_stream" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_stream" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        prismaMock.chat.findFirst.mockResolvedValue({ id: "chat_99" });
        prismaMock.message.create.mockResolvedValue({ id: "m_user" });
        prismaMock.message.findMany.mockResolvedValue([
            { role: "user", content: "I feel anxious" },
        ]);

        const encoder = new TextEncoder();
        const sseStream = new ReadableStream<Uint8Array>({
            start(controller) {
                // Deliberately split an SSE event across two chunks
                controller.enqueue(
                    encoder.encode('data: {"choices":[{"delta":{"content":"Take "}}]}\n\ndata: {"choi')
                );
                controller.enqueue(
                    encoder.encode('ces":[{"delta":{"content":"a deep breath."}}]}\n\ndata: [DONE]\n')
                );
                controller.close();
            },
        });

        fetchMock.mockResolvedValue(new Response(sseStream, { status: 200 }));

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/chat", {
                body: { messages: [{ role: "user", content: "I feel anxious" }] },
            })
        );

        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBe("Take a deep breath.");

        expect(prismaMock.message.create).toHaveBeenCalledWith({
            data: { chatId: "chat_99", role: "assistant", content: "Take a deep breath." },
        });
    });

    it("returns 502 when upstream AI provider responds with non-OK status", async () => {
        const user = createMockUser({ id: "u_stream" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_stream" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findFirst.mockResolvedValue({ id: "chat_99" });
        prismaMock.message.create.mockResolvedValue({ id: "m_user" });
        prismaMock.message.findMany.mockResolvedValue([{ role: "user", content: "Hello" }]);

        fetchMock.mockResolvedValue(new Response("Upstream failure", { status: 503 }));

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/chat", {
                body: { messages: [{ role: "user", content: "Hello" }] },
            })
        );
        expect(res.status).toBe(502);
    });
});
