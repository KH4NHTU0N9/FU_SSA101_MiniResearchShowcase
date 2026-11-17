import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { POST } from "@/app/api/flashcards/route";

describe("POST /api/flashcards", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("enforces CSRF origin guard and Tailwind color enum allowlist", async () => {
        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/flashcards", {
                        origin: "https://evil.example",
                        body: { title: "Deck", color: "bg-rose-500" },
                    })
                )
            ).status
        ).toBe(403);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildJsonRequest("http://localhost:3000/api/flashcards", {
                        body: { title: "Deck", color: "bg-arbitrary-color" },
                    })
                )
            ).status
        ).toBe(400);
    });

    it("creates deck scoped to authenticated user and returns 201", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcardDeck.create.mockResolvedValue({
            id: "d_new",
            userId: "u1",
            title: "Algorithms",
            description: null,
            color: "bg-indigo-500",
            cards: [],
        });

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/flashcards", {
                body: { title: "  Algorithms  ", color: "bg-indigo-500" },
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.flashcardDeck.create).toHaveBeenCalledWith({
            data: {
                userId: "u1",
                title: "Algorithms",
                description: null,
                color: "bg-indigo-500",
            },
            include: { cards: true },
        });
    });
});
