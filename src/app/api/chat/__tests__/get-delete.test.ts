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

import { DELETE, GET } from "@/app/api/chat/route";

describe("GET & DELETE /api/chat", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("returns formatted bot/user messages chronologically and empty array when no chat exists", async () => {
        const user = createMockUser({ id: "u_chat" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_chat" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        prismaMock.chat.findFirst.mockResolvedValueOnce(null);
        const emptyRes = await GET();
        expect(emptyRes.status).toBe(200);
        expect(await emptyRes.json()).toEqual({ messages: [] });

        prismaMock.user.findUnique.mockResolvedValue(user);
        const ts = new Date("2026-03-01T10:00:00.000Z");
        prismaMock.chat.findFirst.mockResolvedValueOnce({
            id: "chat_1",
            messages: [
                { id: "m1", role: "user", content: "Hi", createdAt: ts },
                { id: "m2", role: "assistant", content: "Hello!", createdAt: ts },
            ],
        });
        const filledRes = await GET();
        const body = (await filledRes.json()) as {
            messages: Array<{ id: string; role: string; text: string; type: string }>;
        };
        expect(body.messages).toHaveLength(2);
        expect(body.messages[1].role).toBe("bot");
        expect(body.messages[1].text).toBe("Hello!");
    });

    it("enforces origin guard and deletes only authenticated user's chats on DELETE", async () => {
        const csrfRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/chat", {
                method: "DELETE",
                origin: "https://evil.site",
            })
        );
        expect(csrfRes.status).toBe(403);

        const user = createMockUser({ id: "u_chat" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u_chat" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.deleteMany.mockResolvedValue({ count: 1 });

        const okRes = await DELETE(
            buildJsonRequest("http://localhost:3000/api/chat", { method: "DELETE" })
        );
        expect(okRes.status).toBe(200);
        expect(prismaMock.chat.deleteMany).toHaveBeenCalledWith({
            where: { userId: "u_chat" },
        });
    });
});
