"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, PhoneCall, RotateCcw, Send, User } from "lucide-react";
import ProtectedRoute from "@/components/layout/protected-route";
import { ProfessionalHelpModal } from "@/components/features/professional-help-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { detectCrisisRisk } from "@/lib/chat/risk";
import { cn } from "@/lib/utils";
import type { ChatMessageDTO } from "@/types";

interface UiChatMessage extends ChatMessageDTO {
    isSynthetic?: boolean;
}

const MAX_CONTEXT_MESSAGES = 39;

function createGreetingMessage(text: string): UiChatMessage {
    return {
        id: `local-greeting-${crypto.randomUUID()}`,
        role: "bot",
        text,
        timestamp: new Date(),
        type: "normal",
        isSynthetic: true,
    };
}

export default function ChatPage() {
    return (
        <ProtectedRoute>
            <ChatContent />
        </ProtectedRoute>
    );
}

function ChatContent() {
    const { showToast } = useToast();
    const [messages, setMessages] = useState<UiChatMessage[]>(() => [
        createGreetingMessage(
            "Hello! I'm your learning support companion. How are you feeling about your studies today?"
        ),
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [helpReason, setHelpReason] = useState<"score" | "chat" | "manual">("manual");
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const scrollRef = useRef<HTMLDivElement>(null);
    const streamAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchHistory = async () => {
            try {
                const res = await fetch("/api/chat", { signal: controller.signal });
                if (!res.ok) return;

                const data = (await res.json()) as {
                    messages?: Array<Omit<ChatMessageDTO, "timestamp"> & { timestamp: string }>;
                };
                if (data.messages && data.messages.length > 0) {
                    const hydrated: UiChatMessage[] = data.messages.map((m) => ({
                        ...m,
                        timestamp: new Date(m.timestamp),
                        type: detectCrisisRisk(m.text) ? "risk" : m.type ?? "normal",
                    }));
                    setMessages(hydrated);
                }
            } catch (error) {
                if ((error as Error)?.name !== "AbortError") {
                    console.error("Failed to load chat history:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingHistory(false);
                }
            }
        };

        void fetchHistory();

        return () => {
            controller.abort();
            streamAbortRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isTyping) return;

        const isRisk = detectCrisisRisk(trimmed);
        const userMsg: UiChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            text: trimmed,
            timestamp: new Date(),
            type: isRisk ? "risk" : "normal",
        };

        const historyForApi = messages
            .filter((m) => !m.isSynthetic && m.text.trim().length > 0)
            .slice(-MAX_CONTEXT_MESSAGES)
            .map((m) => ({
                role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
                content: m.text.slice(0, 4000),
            }));

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        if (isRisk) {
            setHelpReason("chat");
            setShowHelpModal(true);
        }

        streamAbortRef.current?.abort();
        const controller = new AbortController();
        streamAbortRef.current = controller;

        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        const botMsgId = crypto.randomUUID();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    messages: [...historyForApi, { role: "user", content: trimmed.slice(0, 4000) }],
                }),
            });

            if (!response.ok) {
                const errData = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(errData.error || "API request failed");
            }

            if (!response.body) {
                throw new Error("No response stream received");
            }

            const botMsg: UiChatMessage = {
                id: botMsgId,
                role: "bot",
                text: "",
                timestamp: new Date(),
                type: isRisk ? "risk" : "normal",
            };
            setMessages((prev) => [...prev, botMsg]);

            reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunkValue = decoder.decode(value, { stream: true });
                if (chunkValue) {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === botMsgId ? { ...msg, text: msg.text + chunkValue } : msg
                        )
                    );
                }
            }
            const trailing = decoder.decode();
            if (trailing) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === botMsgId ? { ...msg, text: msg.text + trailing } : msg
                    )
                );
            }
        } catch (error) {
            if ((error as Error)?.name === "AbortError") {
                return;
            }
            const errMessage =
                error instanceof Error ? error.message : "Connection failed. Please try again.";
            const errorMsg: UiChatMessage = {
                id: `local-error-${crypto.randomUUID()}`,
                role: "bot",
                text: `Error: ${errMessage}. Please try again.`,
                timestamp: new Date(),
                type: "normal",
                isSynthetic: true,
            };
            setMessages((prev) => [...prev.filter((m) => m.id !== botMsgId || m.text.length > 0), errorMsg]);
        } finally {
            try {
                reader?.releaseLock();
            } catch {
                // Ignore if already unlocked
            }
            if (streamAbortRef.current === controller) {
                streamAbortRef.current = null;
            }
            setIsTyping(false);
        }
    };

    const resetChat = async () => {
        streamAbortRef.current?.abort();
        streamAbortRef.current = null;
        setIsTyping(false);

        try {
            const res = await fetch("/api/chat", { method: "DELETE" });
            if (!res.ok) {
                showToast("Could not clear saved chat history on the server.", "error");
            }
        } catch {
            showToast("Network error while clearing chat history.", "error");
        }

        setMessages([
            createGreetingMessage("Chat history cleared. How can I help you now?"),
        ]);
    };

    if (isLoadingHistory) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background w-full">
                <p className="text-muted-foreground animate-pulse">Loading conversation...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 bg-background flex items-center justify-center">
            <ProfessionalHelpModal
                open={showHelpModal}
                onOpenChange={setShowHelpModal}
                reason={helpReason}
            />

            <Card className="w-full max-w-3xl h-[85dvh] flex flex-col glass-card relative overflow-hidden">
                <CardHeader className="border-b border-white/10 relative z-10 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="w-6 h-6 text-primary" aria-hidden="true" />
                        AI Support Assistant
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => void resetChat()}
                            title="Clear Chat History"
                            aria-label="Clear chat history"
                        >
                            <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs h-8 gap-1"
                            onClick={() => {
                                setHelpReason("manual");
                                setShowHelpModal(true);
                            }}
                        >
                            <PhoneCall className="w-3 h-3" aria-hidden="true" /> I need support
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 relative z-10">
                    <div
                        ref={scrollRef}
                        role="log"
                        aria-live="polite"
                        aria-label="Chat messages"
                        className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full mb-4",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex max-w-[85%] gap-3",
                                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    <div
                                        aria-hidden="true"
                                        className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : msg.type === "risk"
                                                    ? "bg-red-500 text-primary-foreground"
                                                    : "bg-secondary text-secondary-foreground"
                                        )}
                                    >
                                        {msg.role === "user" ? (
                                            <User className="w-5 h-5" />
                                        ) : msg.type === "risk" ? (
                                            <PhoneCall className="w-5 h-5" />
                                        ) : (
                                            <Bot className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div
                                            className={cn(
                                                "p-4 rounded-2xl shadow-sm text-sm leading-relaxed overflow-hidden",
                                                msg.role === "user"
                                                    ? "bg-primary/20 text-foreground rounded-tr-none border border-primary/20"
                                                    : msg.type === "risk"
                                                        ? "bg-red-500/10 text-red-700 dark:text-red-200 border border-red-500/50 rounded-tl-none"
                                                        : "bg-black/5 dark:bg-white/10 backdrop-blur-md rounded-tl-none border border-black/10 dark:border-white/20"
                                            )}
                                        >
                                            <div className="prose dark:prose-invert prose-sm max-w-none break-words">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({ ...props }) => (
                                                            <p className="mb-2 last:mb-0" {...props} />
                                                        ),
                                                        a: ({ ...props }) => (
                                                            <a
                                                                {...props}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="underline text-primary"
                                                            />
                                                        ),
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                        {msg.type === "risk" && msg.role === "bot" && (
                                            <div className="text-xs text-red-500 dark:text-red-400 pl-2 font-medium">
                                                Hotline: 111 (Child Helpline) or 115
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start w-full" aria-label="Assistant is typing">
                                <div className="flex max-w-[80%] gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5" aria-hidden="true" />
                                    </div>
                                    <div className="bg-black/5 dark:bg-white/10 p-4 rounded-2xl rounded-tl-none border border-black/10 dark:border-white/20 flex gap-1 items-center h-12">
                                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce delay-100" />
                                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="p-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 relative z-10">
                    <form
                        className="flex w-full gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleSend();
                        }}
                    >
                        <input
                            aria-label="Chat message"
                            className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                            maxLength={4000}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="h-12 w-12 rounded-lg"
                            disabled={isTyping || !input.trim()}
                            aria-label="Send message"
                        >
                            <Send className="w-5 h-5" aria-hidden="true" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
