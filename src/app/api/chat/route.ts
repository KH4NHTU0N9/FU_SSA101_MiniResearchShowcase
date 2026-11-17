export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    guardRateLimit,
    handlePrismaError,
    jsonError,
    parseJsonBody,
    requireAuth,
} from "@/lib/api/response";
import { chatPayloadSchema } from "@/lib/validation";

const SYSTEM_PROMPT =
    "You are a compassionate, supportive, and knowledgeable mental health and study companion for students. Your goal is to listen without judgment, offer empathetic support, and provide practical study or stress-management advice when appropriate. If a user seems to be in immediate danger (suicidal), urge them to seek professional help immediately, but remain calm and supportive. Keep responses concise and natural.";

const UPSTREAM_TIMEOUT_MS = 45_000;

export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const chat = await prisma.chat.findFirst({
            where: { userId: auth.ctx.user.id },
            orderBy: { createdAt: "desc" },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                    take: 100,
                },
            },
        });

        if (!chat) {
            return NextResponse.json({ messages: [] });
        }

        const formattedMessages = chat.messages.map((msg) => ({
            id: msg.id,
            role: msg.role === "assistant" ? "bot" : msg.role,
            text: msg.content,
            timestamp: msg.createdAt,
            type: "normal",
        }));

        return NextResponse.json({ messages: formattedMessages });
    } catch (error) {
        return handlePrismaError(error, "chat GET");
    }
}

export async function DELETE(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        await prisma.chat.deleteMany({
            where: { userId: auth.ctx.user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "chat DELETE");
    }
}

function extractSseContent(line: string): string {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) return "";
    const data = trimmed.slice(6);
    if (data === "[DONE]") return "";
    try {
        const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
        };
        return parsed.choices?.[0]?.delta?.content ?? "";
    } catch {
        return "";
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const rateError = guardRateLimit(
            req,
            "chat:post",
            { windowMs: 15 * 60 * 1000, maxRequests: 30 },
            auth.ctx.user.id
        );
        if (rateError) return rateError;

        const apiKey = process.env.CHAT_API_KEY;
        if (!apiKey) {
            return jsonError("AI chat service is not configured on the server.", 503);
        }

        const parsed = await parseJsonBody(req, chatPayloadSchema);
        if (parsed.error) return parsed.error;

        const userId = auth.ctx.user.id;
        const { messages } = parsed.data;
        const lastUserMessage = messages[messages.length - 1];

        // Find or create latest chat thread and persist user message atomically
        const { chatId, history } = await prisma.$transaction(async (tx) => {
            let chat = await tx.chat.findFirst({
                where: { userId },
                orderBy: { createdAt: "desc" },
                select: { id: true },
            });

            if (!chat) {
                chat = await tx.chat.create({
                    data: { userId, title: "New Conversation" },
                    select: { id: true },
                });
            }

            await tx.message.create({
                data: {
                    chatId: chat.id,
                    role: "user",
                    content: lastUserMessage.content,
                },
            });

            const recent = await tx.message.findMany({
                where: {
                    chatId: chat.id,
                    role: { in: ["user", "assistant"] },
                },
                orderBy: { createdAt: "desc" },
                take: 20,
                select: { role: true, content: true },
            });

            return {
                chatId: chat.id,
                history: recent.reverse(),
            };
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
        const abortUpstream = () => controller.abort();
        req.signal.addEventListener("abort", abortUpstream, { once: true });

        let upstreamResponse: Response;
        try {
            upstreamResponse = await fetch("https://api.apifree.ai/v1/chat/completions", {
                method: "POST",
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "openai/gpt-5",
                    stream: true,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        ...history,
                    ],
                }),
            });
        } catch (fetchError) {
            clearTimeout(timeoutId);
            req.signal.removeEventListener("abort", abortUpstream);
            if ((fetchError as Error).name === "AbortError") {
                return jsonError("AI request timed out or was cancelled.", 504);
            }
            console.error("[chat POST upstream fetch]", fetchError);
            return jsonError("Unable to reach AI service.", 502);
        }

        if (!upstreamResponse.ok || !upstreamResponse.body) {
            clearTimeout(timeoutId);
            req.signal.removeEventListener("abort", abortUpstream);
            const errorText = await upstreamResponse.text().catch(() => "");
            console.error("[chat POST upstream status]", upstreamResponse.status, errorText.slice(0, 300));
            return jsonError("AI service is temporarily unavailable.", 502);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullReply = "";
        let buffer = "";
        let replyPersisted = false;

        const persistReply = async () => {
            if (replyPersisted || !fullReply) return;
            replyPersisted = true;
            try {
                await prisma.message.create({
                    data: { chatId, role: "assistant", content: fullReply },
                });
            } catch (dbErr) {
                console.error("[chat POST save reply]", dbErr);
            }
        };

        const transformStream = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controllerOut) {
                buffer += decoder.decode(chunk, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    const content = extractSseContent(line);
                    if (content) {
                        fullReply += content;
                        controllerOut.enqueue(encoder.encode(content));
                    }
                }
            },
            async flush(controllerOut) {
                clearTimeout(timeoutId);
                req.signal.removeEventListener("abort", abortUpstream);
                if (buffer) {
                    const trailing = extractSseContent(buffer);
                    if (trailing) {
                        fullReply += trailing;
                        controllerOut.enqueue(encoder.encode(trailing));
                    }
                    buffer = "";
                }
                await persistReply();
            },
        });

        const stream = upstreamResponse.body.pipeThrough(transformStream);

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
            },
        });
    } catch (error) {
        return handlePrismaError(error, "chat POST");
    }
}
