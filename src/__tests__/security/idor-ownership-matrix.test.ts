import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest, buildRawRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
    prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
    unstable_cache: <T extends (...args: never[]) => Promise<unknown>>(fn: T) => fn,
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

import { DELETE as communityDelete } from "@/app/api/community/[id]/route";
import { DELETE as materialDelete } from "@/app/api/exam-materials/[id]/route";
import { DELETE as deckDelete } from "@/app/api/flashcards/[id]/route";
import { POST as cardPost } from "@/app/api/flashcards/cards/route";
import { DELETE as cardDelete } from "@/app/api/flashcards/cards/[id]/route";
import { DELETE as fixedDelete } from "@/app/api/scheduler/fixed/[id]/route";
import { DELETE as taskDelete, PATCH as taskPatch } from "@/app/api/scheduler/tasks/[id]/route";
import { PUT as batchPut } from "@/app/api/scheduler/tasks/batch/route";

describe("security/idor-ownership-matrix", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockResolvedValue({ user: { id: "attacker-user", tokenVersion: 1 } });
        prismaMock.user.findUnique.mockResolvedValue({ id: "attacker-user", tokenVersion: 1 } as never);
    });

    it("denies cross-tenant mutations on posts, materials, flashcard decks/cards, and scheduler entities", async () => {
        prismaMock.post.findUnique.mockResolvedValue({ id: "p1", authorId: "victim-user" } as never);
        const postRes = await communityDelete(
            buildRawRequest("http://localhost/api/community/p1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "p1" }) }
        );
        expect(postRes.status).toBe(403);
        expect(prismaMock.post.delete).not.toHaveBeenCalled();

        prismaMock.material.findUnique.mockResolvedValue({
            uploadedById: "victim-user",
            fileUrl: null,
            files: [],
        } as never);
        const matRes = await materialDelete(
            buildRawRequest("http://localhost/api/exam-materials/m1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "m1" }) }
        );
        expect(matRes.status).toBe(403);
        expect(prismaMock.material.delete).not.toHaveBeenCalled();

        prismaMock.flashcardDeck.findUnique.mockResolvedValue({
            id: "d1",
            userId: "victim-user",
        } as never);
        const deckDelRes = await deckDelete(
            buildRawRequest("http://localhost/api/flashcards/d1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "d1" }) }
        );
        expect(deckDelRes.status).toBe(403);

        const cardAddRes = await cardPost(
            buildJsonRequest("http://localhost/api/flashcards/cards", {
                method: "POST",
                body: { deckId: "d1", front: "F", back: "B" },
            })
        );
        expect(cardAddRes.status).toBe(403);

        prismaMock.flashcard.findUnique.mockResolvedValue({
            id: "c1",
            deck: { userId: "victim-user" },
        } as never);
        const cardDelRes = await cardDelete(
            buildRawRequest("http://localhost/api/flashcards/cards/c1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "c1" }) }
        );
        expect(cardDelRes.status).toBe(403);

        prismaMock.fixedEvent.findUnique.mockResolvedValue({
            id: "fe1",
            userId: "victim-user",
        } as never);
        const fixedDelRes = await fixedDelete(
            buildRawRequest("http://localhost/api/scheduler/fixed/fe1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "fe1" }) }
        );
        expect(fixedDelRes.status).toBe(403);

        prismaMock.task.findUnique.mockResolvedValue({
            id: "t1",
            userId: "victim-user",
            groupId: null,
        } as never);
        const taskDelRes = await taskDelete(
            buildRawRequest("http://localhost/api/scheduler/tasks/t1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "t1" }) }
        );
        expect(taskDelRes.status).toBe(403);

        const taskPatchRes = await taskPatch(
            buildJsonRequest("http://localhost/api/scheduler/tasks/t1", {
                method: "PATCH",
                body: { scheduledDay: "Monday", scheduledStartTime: "09:00" },
            }),
            { params: Promise.resolve({ id: "t1" }) }
        );
        expect(taskPatchRes.status).toBe(403);

        prismaMock.task.count.mockResolvedValue(0);
        const batchRes = await batchPut(
            buildJsonRequest("http://localhost/api/scheduler/tasks/batch", {
                method: "PUT",
                body: { updates: [{ id: "t1", assignedSlot: { day: "Monday", startTime: "09:00" } }] },
            })
        );
        expect(batchRes.status).toBe(404);
    });
});
