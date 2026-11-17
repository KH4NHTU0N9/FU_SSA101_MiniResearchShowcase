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

import { DELETE } from "@/app/api/flashcards/[id]/route";

describe("DELETE /api/flashcards/[id]", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("enforces owner-only authorization against IDOR deck deletion", async () => {
        const user = createMockUser({ id: "u_attacker" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_attacker" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcardDeck.findUnique.mockResolvedValueOnce(null);

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/flashcards/d1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "d1" }) }
                )
            ).status
        ).toBe(404);

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.flashcardDeck.findUnique.mockResolvedValueOnce({
            id: "d1",
            userId: "u_owner",
        });

        expect(
            (
                await DELETE(
                    buildJsonRequest("http://localhost:3000/api/flashcards/d1", {
                        method: "DELETE",
                    }),
                    { params: Promise.resolve({ id: "d1" }) }
                )
            ).status
        ).toBe(403);
    });

    it("deletes deck owned by caller", async () => {
        const owner = createMockUser({ id: "u_owner" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_owner" }));
        prismaMock.user.findUnique.mockResolvedValue(owner);
        prismaMock.flashcardDeck.findUnique.mockResolvedValue({
            id: "d1",
            userId: "u_owner",
        });
        prismaMock.flashcardDeck.delete.mockResolvedValue({});

        const res = await DELETE(
            buildJsonRequest("http://localhost:3000/api/flashcards/d1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "d1" }) }
        );
        expect(res.status).toBe(200);
        expect(prismaMock.flashcardDeck.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
    });
});
