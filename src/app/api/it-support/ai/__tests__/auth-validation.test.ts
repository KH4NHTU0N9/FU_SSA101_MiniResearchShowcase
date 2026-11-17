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

describe("POST /api/it-support/ai — auth, CSRF, and validation", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        getSessionMock.mockReset();
        vi.stubEnv("GEMINI_API_KEY", "server-only-gemini-key");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("rejects CSRF, unauthenticated requests, and missing server GEMINI_API_KEY", async () => {
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/it-support/ai", {
                        origin: "https://evil.example",
                        body: { context: "Explain Merge Sort" },
                    })
                )
            ).status
        ).toBe(403);

        getSessionMock.mockResolvedValue(null);
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/it-support/ai", {
                        body: { context: "Explain Merge Sort" },
                    })
                )
            ).status
        ).toBe(401);

        const user = createMockUser({ id: "u_ai" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_ai" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        vi.stubEnv("GEMINI_API_KEY", "");

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/it-support/ai", {
                        body: { context: "Explain Merge Sort" },
                    })
                )
            ).status
        ).toBe(503);
    });

    it("rejects short prompts and rate limits >25 requests per 15 minutes", async () => {
        const user = createMockUser({ id: "u_ai_limit" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_ai_limit" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        for (let i = 0; i < 25; i++) {
            const res = await POST(
                buildJsonRequest("http://localhost:3000/api/it-support/ai", {
                    body: { context: "x" }, // rejected 400 after rate increment
                })
            );
            expect(res.status).toBe(400);
        }

        const limited = await POST(
            buildJsonRequest("http://localhost:3000/api/it-support/ai", {
                body: { context: "Explain IEEE 754" },
            })
        );
        expect(limited.status).toBe(429);
    });
});
