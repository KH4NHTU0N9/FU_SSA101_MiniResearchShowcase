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

import { POST } from "@/app/api/it-support/ai/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/it-support/ai — Gemini proxy headers and retry resilience", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        vi.stubEnv("GEMINI_API_KEY", "secret-gemini-server-key");
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("passes API key via x-goog-api-key header (never URL) and retries transient 503", async () => {
        vi.useFakeTimers();
        const user = createMockUser({ id: "u_retry" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_retry" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        fetchMock
            .mockResolvedValueOnce(new Response("busy", { status: 503 }))
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        candidates: [{ content: { parts: [{ text: "O(n log n) via Merge Sort" }] } }],
                    }),
                    { status: 200 }
                )
            );

        const promise = POST(
            buildJsonRequest("http://localhost:3000/api/it-support/ai", {
                body: { context: "Explain Merge Sort Big-O" },
            })
        );

        await vi.runAllTimersAsync();
        const res = await promise;
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ explanation: "O(n log n) via Merge Sort" });

        const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(calledUrl).not.toContain("secret-gemini-server-key");
        expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
            "secret-gemini-server-key"
        );
    });

    it("does not retry non-retryable 400 upstream client errors", async () => {
        const user = createMockUser({ id: "u_bad_req" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_bad_req" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        fetchMock.mockResolvedValueOnce(new Response("bad request", { status: 400 }));

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/it-support/ai", {
                body: { context: "Explain Bitwise XOR" },
            })
        );
        expect(res.status).toBe(400);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
