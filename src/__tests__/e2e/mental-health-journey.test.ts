import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildJsonRequest } from "@/test/mocks/next";

const { cookieJar, assessments, moodLogs, chats, chatMessages, userRecord } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    assessments: [] as Array<{
        id: string;
        userId: string;
        depressionScore: number;
        anxietyScore: number;
        stressScore: number;
        createdAt: Date;
    }>,
    moodLogs: [] as Array<{
        id: string;
        userId: string;
        mood: number;
        energy: number;
        emotion: string;
        focus: number;
        note?: string | null;
        createdAt: Date;
    }>,
    chats: [] as Array<{ id: string; userId: string; title: string; createdAt: Date }>,
    chatMessages: [] as Array<{
        id: string;
        chatId: string;
        role: string;
        content: string;
        createdAt: Date;
    }>,
    userRecord: {
        id: "user-mh-1",
        email: "mh@fpt.edu.vn",
        name: "Dung Pham",
        tokenVersion: 1,
    },
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => {
            const val = cookieJar.get(name);
            return val ? { name, value: val } : undefined;
        },
        set: (name: string, value: string) => {
            cookieJar.set(name, value);
        },
        delete: (name: string) => {
            cookieJar.delete(name);
        },
    }),
}));

vi.mock("@/lib/prisma", () => {
    const models = {
        user: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                where.id === userRecord.id ? userRecord : null,
        },
        assessment: {
            create: async ({ data }: { data: { userId: string; depressionScore: number; anxietyScore: number; stressScore: number } }) => {
                const row = { id: `asm-${assessments.length + 1}`, ...data, createdAt: new Date() };
                assessments.push(row);
                return row;
            },
            findFirst: async ({ where }: { where: { userId: string } }) =>
                assessments.filter((a) => a.userId === where.userId).at(-1) ?? null,
        },
        moodLog: {
            create: async ({ data }: { data: { userId: string; mood: number; energy: number; emotion: string; focus: number; note?: string | null } }) => {
                const row = { id: `mood-${moodLogs.length + 1}`, ...data, createdAt: new Date() };
                moodLogs.push(row);
                return row;
            },
            findMany: async ({ where }: { where: { userId: string } }) =>
                moodLogs.filter((m) => m.userId === where.userId).reverse(),
        },
        chat: {
            findFirst: async ({ where, include }: { where: { userId: string }; include?: { messages?: unknown } }) => {
                const c = chats.filter((x) => x.userId === where.userId).at(-1);
                if (!c) return null;
                if (include?.messages) {
                    return { ...c, messages: chatMessages.filter((m) => m.chatId === c.id) };
                }
                return c;
            },
            create: async ({ data }: { data: { userId: string; title: string } }) => {
                const row = { id: `chat-${chats.length + 1}`, ...data, createdAt: new Date() };
                chats.push(row);
                return row;
            },
            deleteMany: async () => {
                chats.length = 0;
                chatMessages.length = 0;
            },
        },
        message: {
            create: async ({ data }: { data: { chatId: string; role: string; content: string } }) => {
                const row = { id: `msg-${chatMessages.length + 1}`, ...data, createdAt: new Date() };
                chatMessages.push(row);
                return row;
            },
            findMany: async ({ where }: { where: { chatId: string } }) =>
                chatMessages.filter((m) => m.chatId === where.chatId),
        },
    };
    return {
        prisma: {
            ...models,
            $transaction: async <T,>(cb: (tx: typeof models) => Promise<T>): Promise<T> =>
                cb(models),
        },
    };
});

import { setSession } from "@/lib/session";
import { GET as assessmentGet, POST as assessmentPost } from "@/app/api/assessment/route";
import { GET as moodGet, POST as moodPost } from "@/app/api/mood/route";
import { GET as chatGet, POST as chatPost } from "@/app/api/chat/route";

describe("e2e/mental-health-journey", () => {
    const prevKey = process.env.CHAT_API_KEY;

    beforeEach(async () => {
        cookieJar.clear();
        assessments.length = 0;
        moodLogs.length = 0;
        chats.length = 0;
        chatMessages.length = 0;
        process.env.CHAT_API_KEY = "test-chat-key";

        await setSession({
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            tokenVersion: userRecord.tokenVersion,
        });
    });

    afterEach(() => {
        if (prevKey === undefined) delete process.env.CHAT_API_KEY;
        else process.env.CHAT_API_KEY = prevKey;
        vi.unstubAllGlobals();
    });

    it("persists DASS-21 assessment, daily mood check-in, and streamed AI chat history across endpoints", async () => {
        const asmReq = new NextRequest("http://localhost/api/assessment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                origin: "http://localhost",
            },
            body: JSON.stringify({ scores: { Depression: 12, Anxiety: 8, Stress: 10 } }),
        });
        expect((await assessmentPost(asmReq)).status).toBe(201);

        const latestAsm = await (await assessmentGet()).json();
        expect(latestAsm.depressionScore).toBe(12);

        const moodReq = new NextRequest("http://localhost/api/mood", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                origin: "http://localhost",
            },
            body: JSON.stringify({
                mood: 2,
                energy: 25,
                emotion: "anxious",
                focus: 2,
            }),
        });
        expect((await moodPost(moodReq)).status).toBe(201);

        const savedMoods = await (await moodGet()).json();
        expect(savedMoods).toHaveLength(1);
        expect(savedMoods[0].emotion).toBe("anxious");

        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                const sse = new ReadableStream({
                    start(controller) {
                        controller.enqueue(
                            new TextEncoder().encode(
                                'data: {"choices":[{"delta":{"content":"Take a deep breath."}}]}\n\ndata: [DONE]\n\n'
                            )
                        );
                        controller.close();
                    },
                });
                return new Response(sse, { status: 200 });
            })
        );

        const chatRes = await chatPost(
            buildJsonRequest("http://localhost/api/chat", {
                method: "POST",
                headers: { "x-forwarded-for": "198.51.100.13" },
                body: { messages: [{ role: "user", content: "Feeling stressed about exams" }] },
            })
        );
        expect(chatRes.status).toBe(200);
        expect(await chatRes.text()).toBe("Take a deep breath.");

        const historyJson = await (await chatGet()).json();
        expect(historyJson.messages.map((m: { text: string }) => m.text)).toEqual([
            "Feeling stressed about exams",
            "Take a deep breath.",
        ]);
    });
});
